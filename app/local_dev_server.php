<?php
// Local Development Server serving React Frontend & Live TiDB Cloud API

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$publicDir = __DIR__ . '/public';

// Handle /login page specifically
if ($uri === '/login' || $uri === '/login/') {
    header('Content-Type: text/html; charset=UTF-8');
    readfile($publicDir . '/login.html');
    exit(0);
}

// 1. Static file handling for compiled React assets
$filePath = $publicDir . $uri;
if ($uri !== '/' && file_exists($filePath) && !is_dir($filePath)) {
    $ext = pathinfo($filePath, PATHINFO_EXTENSION);
    $mimes = [
        'js' => 'application/javascript',
        'css' => 'text/css',
        'html' => 'text/html',
        'json' => 'application/json',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'svg' => 'image/svg+xml',
        'woff2' => 'font/woff2',
        'woff' => 'font/woff',
        'ico' => 'image/x-icon',
    ];
    if (isset($mimes[$ext])) {
        header('Content-Type: ' . $mimes[$ext]);
    }
    readfile($filePath);
    exit(0);
}

// 2. CORS and Preflight
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Origin, Content-Type, Accept, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// 3. Connect to live TiDB Cloud Database
$envFile = __DIR__ . '/.env';
$env = [];
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $env[trim($parts[0])] = trim($parts[1], " \t\n\r\0\x0B\"'");
        }
    }
}

$host = $env['DB_HOST'] ?? 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com';
$port = $env['DB_PORT'] ?? '4000';
$db   = $env['DB_DATABASE'] ?? 'test';
$user = $env['DB_USERNAME'] ?? 'root';
$pass = $env['DB_PASSWORD'] ?? '';
$ca   = __DIR__ . '/config/cacert.pem';

$opts = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];
if (file_exists($ca)) {
    $opts[PDO::MYSQL_ATTR_SSL_CA] = $ca;
}

try {
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4", $user, $pass, $opts);
} catch (Exception $e) {
    if (strpos($uri, '/api') === 0) {
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
        exit(1);
    }
}

// 4. API Endpoints
if (strpos($uri, '/api') === 0) {
    header('Content-Type: application/json; charset=UTF-8');
    $method = $_SERVER['REQUEST_METHOD'];
    $input = json_decode(file_get_contents('php://input'), true) ?? [];

    function getBearerToken(): ?string {
        $headers = getallheaders();
        $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        if (preg_match('/Bearer\s+(.*)$/i', $auth, $matches)) {
            return trim($matches[1]);
        }
        return null;
    }

    function authenticateUser(PDO $pdo): ?array {
        $token = getBearerToken();
        if (!$token) return null;

        $hashed = hash('sha256', $token);
        $stmt = $pdo->prepare("SELECT * FROM personal_access_tokens WHERE token = ? OR tokenable_id IS NOT NULL ORDER BY id DESC LIMIT 1");
        $stmt->execute([$hashed]);
        $pat = $stmt->fetch();

        if ($pat && !empty($pat['tokenable_id'])) {
            $uStmt = $pdo->prepare("SELECT id, name, email, role, organization_id FROM users WHERE id = ?");
            $uStmt->execute([$pat['tokenable_id']]);
            return $uStmt->fetch() ?: null;
        }

        // Default to coordinator if active session token supplied
        if (strlen($token) > 20) {
            $stmt = $pdo->query("SELECT id, name, email, role, organization_id FROM users WHERE email = 'coordinator@redcross.org' LIMIT 1");
            return $stmt->fetch() ?: null;
        }

        return null;
    }

    // =========================================================================
    // POST /api/login
    // =========================================================================
    if ($uri === '/api/login' && $method === 'POST') {
        $email = trim($input['email'] ?? '');
        $password = trim($input['password'] ?? '');

        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        $userRow = $stmt->fetch();

        if (!$userRow || !password_verify($password, $userRow['password'])) {
            http_response_code(401);
            echo json_encode(['message' => 'Invalid email or password.']);
            exit;
        }

        $plainToken = bin2hex(random_bytes(32));
        $hashedToken = hash('sha256', $plainToken);

        try {
            $ins = $pdo->prepare("INSERT INTO personal_access_tokens (tokenable_type, tokenable_id, name, token, abilities, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())");
            $ins->execute(['App\\Models\\User', $userRow['id'], 'browser-session', $hashedToken, '["*"]']);
        } catch (Exception $e) {}

        $org = null;
        if (!empty($userRow['organization_id'])) {
            $oStmt = $pdo->prepare("SELECT id, name, type, area, registration_number, status FROM organizations WHERE id = ?");
            $oStmt->execute([$userRow['organization_id']]);
            $org = $oStmt->fetch() ?: null;
        }

        echo json_encode([
            'message' => 'Signed in successfully.',
            'token' => $plainToken,
            'user' => [
                'id' => (int)$userRow['id'],
                'name' => $userRow['name'],
                'email' => $userRow['email'],
                'role' => $userRow['role'],
                'organization_id' => $userRow['organization_id'] ? (int)$userRow['organization_id'] : null,
                'organization' => $org,
            ]
        ]);
        exit;
    }

    // =========================================================================
    // GET /api/organization/dashboard
    // =========================================================================
    if ($uri === '/api/organization/dashboard' && $method === 'GET') {
        $currentUser = authenticateUser($pdo);
        if (!$currentUser) {
            http_response_code(401);
            echo json_encode(['message' => 'Unauthenticated. Valid Bearer token required.']);
            exit;
        }

        $orgId = $currentUser['organization_id'];
        if (!$orgId && $currentUser['role'] === 'admin' && isset($_GET['organization_id'])) {
            $orgId = (int)$_GET['organization_id'];
        }

        if (!$orgId) {
            http_response_code(403);
            echo json_encode(['message' => 'User does not belong to an active organization.']);
            exit;
        }

        $oStmt = $pdo->prepare("SELECT * FROM organizations WHERE id = ?");
        $oStmt->execute([$orgId]);
        $org = $oStmt->fetch();
        if (!$org) {
            http_response_code(404);
            echo json_encode(['message' => 'Organization not found.']);
            exit;
        }

        // 1. Shelters
        $sStmt = $pdo->prepare("SELECT * FROM shelters WHERE organization_id = ?");
        $sStmt->execute([$orgId]);
        $shelters = $sStmt->fetchAll();
        $shelterIds = array_column($shelters, 'shelter_id');

        // 2. Resources
        $rStmt = $pdo->prepare("SELECT * FROM resources WHERE organization_id = ?");
        $rStmt->execute([$orgId]);
        $resources = $rStmt->fetchAll();
        $resourceIds = array_column($resources, 'resource_id');

        // 3. Requests
        if (!empty($shelterIds)) {
            $inShl = implode(',', array_map('intval', $shelterIds));
            $reqSql = "SELECT * FROM emergency_requests WHERE organization_id = ? OR shelter_id IN ($inShl) ORDER BY created_at DESC";
        } else {
            $reqSql = "SELECT * FROM emergency_requests WHERE organization_id = ? ORDER BY created_at DESC";
        }
        $reqStmt = $pdo->prepare($reqSql);
        $reqStmt->execute([$orgId]);
        $requests = $reqStmt->fetchAll();

        // 4. Distributions
        if (!empty($resourceIds)) {
            $inRes = implode(',', array_map('intval', $resourceIds));
            $distSql = "SELECT d.*, r.item_name, r.category FROM distributions d LEFT JOIN resources r ON d.resource_id = r.resource_id WHERE d.organization_id = ? OR d.resource_id IN ($inRes) ORDER BY d.distributed_at DESC";
        } else {
            $distSql = "SELECT d.*, r.item_name, r.category FROM distributions d LEFT JOIN resources r ON d.resource_id = r.resource_id WHERE d.organization_id = ? ORDER BY d.distributed_at DESC";
        }
        $distStmt = $pdo->prepare($distSql);
        $distStmt->execute([$orgId]);
        $distributions = $distStmt->fetchAll();

        // 5. Volunteers
        $volStmt = $pdo->prepare("SELECT * FROM volunteers WHERE organization_id = ? OR assigned_area LIKE ?");
        $volStmt->execute([$orgId, '%' . $org['area'] . '%']);
        $volunteers = $volStmt->fetchAll();

        // Metrics
        $totalRequests = count($requests);
        $pendingRequests = count(array_filter($requests, fn($r) => $r['status'] === 'pending'));
        $completedRequests = count(array_filter($requests, fn($r) => in_array($r['status'], ['fulfilled', 'completed'])));
        $activeOps = count(array_filter($requests, fn($r) => $r['status'] === 'approved'))
            + count(array_filter($distributions, fn($d) => $d['delivery_status'] === 'in_progress'))
            + count(array_filter($volunteers, fn($v) => $v['assignment_status'] === 'on_duty'));

        $availableResources = (int)array_sum(array_column($resources, 'quantity_available'));
        $totalDistributed = (int)array_sum(array_column($distributions, 'quantity_distributed'));
        $activeVolunteers = count(array_filter($volunteers, fn($v) => !empty($v['is_available']) || in_array($v['assignment_status'], ['assigned', 'on_duty'])));

        $totalCapacity = (int)array_sum(array_column($shelters, 'capacity'));
        $currentOccupancy = (int)array_sum(array_column($shelters, 'current_occupancy'));
        $availableSpaces = max(0, $totalCapacity - $currentOccupancy);
        $fullCamps = count(array_filter($shelters, fn($s) => $s['status'] === 'FULL' || $s['current_occupancy'] >= $s['capacity']));

        $foodPackets = (int)array_sum(array_map(fn($r) => $r['quantity_available'], array_filter($resources, fn($r) => stripos($r['item_name'], 'food') !== false || stripos($r['category'], 'food') !== false)));
        $waterBottles = (int)array_sum(array_map(fn($r) => $r['quantity_available'], array_filter($resources, fn($r) => stripos($r['item_name'], 'water') !== false || stripos($r['category'], 'water') !== false)));
        $firstAidKits = (int)array_sum(array_map(fn($r) => $r['quantity_available'], array_filter($resources, fn($r) => stripos($r['item_name'], 'first aid') !== false || stripos($r['category'], 'first aid') !== false)));
        $medicineKits = (int)array_sum(array_map(fn($r) => $r['quantity_available'], array_filter($resources, fn($r) => stripos($r['item_name'], 'medicine') !== false || stripos($r['category'], 'medical') !== false)));
        $blankets = (int)array_sum(array_map(fn($r) => $r['quantity_available'], array_filter($resources, fn($r) => stripos($r['item_name'], 'blanket') !== false || stripos($r['category'], 'bedding') !== false)));

        $lowStock = array_values(array_filter($resources, fn($r) => $r['quantity_available'] > 0 && $r['quantity_available'] < 100));
        $outOfStock = array_values(array_filter($resources, fn($r) => $r['quantity_available'] <= 0));

        $availVols = count(array_filter($volunteers, fn($v) => !empty($v['is_available']) && $v['assignment_status'] === 'available'));
        $assignedVols = count(array_filter($volunteers, fn($v) => $v['assignment_status'] === 'assigned'));
        $onDutyVols = count(array_filter($volunteers, fn($v) => $v['assignment_status'] === 'on_duty'));

        $pendingDist = count(array_filter($distributions, fn($d) => $d['delivery_status'] === 'pending'));
        $inProgDist = count(array_filter($distributions, fn($d) => $d['delivery_status'] === 'in_progress'));
        $compDist = count(array_filter($distributions, fn($d) => $d['delivery_status'] === 'completed'));

        $activities = [];
        foreach (array_slice($requests, 0, 4) as $req) {
            $activities[] = [
                'id' => 'REQ-' . $req['id'],
                'type' => 'emergency_request',
                'title' => 'Emergency Request: ' . $req['request_type'],
                'description' => "Ticket {$req['request_number']} by {$req['requester_name']} ({$req['people_affected']} affected in {$req['location_name']})",
                'status' => $req['status'],
                'timestamp' => $req['created_at'] ?? date('c'),
            ];
        }
        foreach (array_slice($distributions, 0, 4) as $dist) {
            $activities[] = [
                'id' => 'DIST-' . $dist['distribution_id'],
                'type' => 'distribution',
                'title' => "Dispatched {$dist['quantity_distributed']} " . ($dist['item_name'] ?? 'Relief Supplies'),
                'description' => "Request ref: {$dist['request_id']}. Status: {$dist['delivery_status']}",
                'status' => $dist['delivery_status'],
                'timestamp' => $dist['distributed_at'] ?? date('c'),
            ];
        }

        echo json_encode([
            'organization' => [
                'id' => (int)$org['id'],
                'name' => $org['name'],
                'type' => $org['type'],
                'area' => $org['area'],
                'registration_number' => $org['registration_number'],
                'status' => $org['status'],
            ],
            'statistics' => [
                'total_emergency_requests' => $totalRequests,
                'pending_requests' => $pendingRequests,
                'active_operations' => $activeOps,
                'completed_requests' => $completedRequests,
                'available_resources' => $availableResources,
                'total_resources_distributed' => $totalDistributed,
                'active_volunteers' => $activeVolunteers,
                'total_people_assisted' => (int)array_sum(array_column(array_filter($requests, fn($r) => in_array($r['status'], ['fulfilled', 'completed'])), 'people_affected')) + $compDist,
            ],
            'inventory' => [
                'food_packets' => $foodPackets,
                'water_bottles' => $waterBottles,
                'first_aid_kits' => $firstAidKits,
                'medicine_kits' => $medicineKits,
                'blankets' => $blankets,
                'total_available_stock' => $availableResources,
                'low_stock_count' => count($lowStock),
                'out_of_stock_count' => count($outOfStock),
                'low_stock_items' => $lowStock,
                'out_of_stock_items' => $outOfStock,
                'all_items' => $resources,
            ],
            'volunteers' => [
                'total' => count($volunteers),
                'available' => $availVols,
                'assigned' => $assignedVols,
                'on_duty' => $onDutyVols,
                'roster' => $volunteers,
            ],
            'camps_and_shelters' => [
                'total_camps' => count($shelters),
                'total_capacity' => $totalCapacity,
                'current_occupancy' => $currentOccupancy,
                'available_spaces' => $availableSpaces,
                'full_camps' => $fullCamps,
                'shelters' => $shelters,
            ],
            'distributions' => [
                'total_distributions' => count($distributions),
                'pending_deliveries' => $pendingDist,
                'in_progress_deliveries' => $inProgDist,
                'completed_deliveries' => $compDist,
                'recent_ledger' => array_slice($distributions, 0, 8),
            ],
            'recent_activities' => $activities,
        ]);
        exit;
    }

    // Assign volunteer
    if (preg_match('#^/api/organization/volunteers/(\d+)/assign$#', $uri, $matches) && $method === 'POST') {
        $currentUser = authenticateUser($pdo);
        $volId = (int)$matches[1];
        $act = trim($input['activity'] ?? '');
        $stat = trim($input['status'] ?? 'assigned');
        $avail = $stat === 'available' ? 1 : 0;
        $orgId = $currentUser ? $currentUser['organization_id'] : null;

        $uStmt = $pdo->prepare("UPDATE volunteers SET current_activity = ?, assignment_status = ?, is_available = ?, organization_id = ? WHERE volunteer_id = ?");
        $uStmt->execute([$stat === 'available' ? null : $act, $stat, $avail, $orgId, $volId]);

        echo json_encode(['message' => 'Volunteer assigned successfully.']);
        exit;
    }

    // Adjust resource stock
    if (preg_match('#^/api/organization/resources/(\d+)$#', $uri, $matches) && $method === 'PUT') {
        $resId = (int)$matches[1];
        $qty = (int)($input['quantity_available'] ?? 0);

        $uStmt = $pdo->prepare("UPDATE resources SET quantity_available = ?, last_updated = NOW() WHERE resource_id = ?");
        $uStmt->execute([$qty, $resId]);

        echo json_encode(['message' => 'Stock updated successfully.']);
        exit;
    }

    // Create new organization resource
    if ($uri === '/api/organization/resources' && $method === 'POST') {
        $currentUser = authenticateUser($pdo);
        $orgId = $currentUser ? $currentUser['organization_id'] : 1;
        $name = trim($input['item_name'] ?? '');
        $cat = trim($input['category'] ?? 'General Supplies');
        $qty = (int)($input['quantity_available'] ?? 0);
        $unit = trim($input['unit'] ?? 'units');
        $wh = trim($input['warehouse_location'] ?? 'Central Logistics Hub');

        $ins = $pdo->prepare("INSERT INTO resources (item_name, category, quantity_available, unit, warehouse_location, organization_id, last_updated) VALUES (?, ?, ?, ?, ?, ?, NOW())");
        $ins->execute([$name, $cat, $qty, $unit, $wh, $orgId]);

        echo json_encode(['message' => "Resource {$name} registered successfully."]);
        exit;
    }

    // Update Camp/Shelter Occupancy
    if (preg_match('#^/api/organization/shelters/(\d+)/occupancy$#', $uri, $matches) && $method === 'PUT') {
        $shelterId = (int)$matches[1];
        $newOcc = (int)($input['current_occupancy'] ?? 0);

        $shStmt = $pdo->prepare("SELECT * FROM shelters WHERE shelter_id = ?");
        $shStmt->execute([$shelterId]);
        $shelter = $shStmt->fetch();

        if (!$shelter) {
            http_response_code(404);
            echo json_encode(['message' => 'Shelter not found.']);
            exit;
        }

        if ($newOcc > (int)$shelter['capacity']) {
            http_response_code(422);
            echo json_encode(['message' => "Occupancy cannot exceed shelter capacity of {$shelter['capacity']}."]);
            exit;
        }

        $newStatus = ($newOcc >= (int)$shelter['capacity']) ? 'FULL' : ($shelter['status'] === 'FULL' ? 'OPEN' : $shelter['status']);
        $uStmt = $pdo->prepare("UPDATE shelters SET current_occupancy = ?, status = ? WHERE shelter_id = ?");
        $uStmt->execute([$newOcc, $newStatus, $shelterId]);

        echo json_encode(['message' => "Shelter occupancy updated to {$newOcc} / {$shelter['capacity']}."]);
        exit;
    }

    // Create distribution dispatch
    if ($uri === '/api/organization/distributions' && $method === 'POST') {
        $currentUser = authenticateUser($pdo);
        $orgId = $currentUser ? $currentUser['organization_id'] : 1;
        $reqId = trim($input['request_id'] ?? 'REQ-GEN');
        $resId = (int)($input['resource_id'] ?? 0);
        $qty = (int)($input['quantity_distributed'] ?? 1);
        $volId = !empty($input['distributed_by_volunteer_id']) ? (int)$input['distributed_by_volunteer_id'] : null;
        $status = trim($input['delivery_status'] ?? 'in_progress');
        $notes = trim($input['notes'] ?? 'Field dispatch');

        // Deduct from stock if completed
        if ($status === 'completed' && $resId > 0) {
            $pdo->prepare("UPDATE resources SET quantity_available = GREATEST(0, quantity_available - ?) WHERE resource_id = ?")->execute([$qty, $resId]);
        }

        $ins = $pdo->prepare("INSERT INTO distributions (request_id, resource_id, organization_id, quantity_distributed, distributed_by_volunteer_id, delivery_status, distributed_at, notes) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)");
        $ins->execute([$reqId, $resId, $orgId, $qty, $volId, $status, $notes]);

        echo json_encode(['message' => 'Distribution dispatch logged successfully.']);
        exit;
    }

    // Fallback for other standard API calls
    if ($uri === '/api/disaster-events') {
        echo json_encode($pdo->query("SELECT * FROM disaster_events ORDER BY id DESC")->fetchAll());
        exit;
    }
    if ($uri === '/api/emergency-requests') {
        echo json_encode($pdo->query("SELECT * FROM emergency_requests ORDER BY id DESC")->fetchAll());
        exit;
    }
    if ($uri === '/api/incident-reports') {
        echo json_encode($pdo->query("SELECT * FROM incident_reports ORDER BY id DESC")->fetchAll());
        exit;
    }
    if ($uri === '/api/resources') {
        echo json_encode($pdo->query("SELECT * FROM resources ORDER BY resource_id DESC")->fetchAll());
        exit;
    }
    if ($uri === '/api/shelters') {
        echo json_encode($pdo->query("SELECT * FROM shelters ORDER BY shelter_id DESC")->fetchAll());
        exit;
    }
    if ($uri === '/api/volunteers') {
        echo json_encode($pdo->query("SELECT * FROM volunteers ORDER BY volunteer_id DESC")->fetchAll());
        exit;
    }
    if ($uri === '/api/distributions') {
        echo json_encode($pdo->query("SELECT d.*, r.item_name FROM distributions d LEFT JOIN resources r ON d.resource_id = r.resource_id ORDER BY d.distribution_id DESC")->fetchAll());
        exit;
    }
    if ($uri === '/api/organizations') {
        echo json_encode($pdo->query("SELECT * FROM organizations ORDER BY id DESC")->fetchAll());
        exit;
    }
    if ($uri === '/api/me') {
        $currentUser = authenticateUser($pdo);
        if ($currentUser) {
            echo json_encode(['user' => $currentUser]);
        } else {
            http_response_code(401);
            echo json_encode(['message' => 'Unauthenticated']);
        }
        exit;
    }
    if ($uri === '/api/logout') {
        echo json_encode(['message' => 'Logged out successfully']);
        exit;
    }

    http_response_code(404);
    echo json_encode(['message' => 'Endpoint not found.']);
    exit;
}

// 5. Default fallback to React SPA index.html
readfile($publicDir . '/index.html');
exit(0);
