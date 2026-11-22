<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Shelter;
use App\Models\Resource;
use App\Models\Volunteer;
use App\Models\Distribution;
use App\Models\EmergencyRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrganizationController extends Controller
{
    /**
     * List all organizations.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Organization::query();

        if ($request->has('type')) {
            $query->where('type', $request->query('type'));
        }

        if ($request->has('area')) {
            $query->where('area', 'like', '%' . $request->query('area') . '%');
        }

        $organizations = $query->withCount(['shelters', 'resources'])->orderBy('name')->get();

        return response()->json($organizations);
    }

    /**
     * Get a single organization with its shelters and resources.
     */
    public function show(int $id): JsonResponse
    {
        $organization = Organization::with(['shelters', 'resources'])->findOrFail($id);

        return response()->json($organization);
    }

    /**
     * Register a new organization.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:200',
            'type' => 'required|in:ngo,hospital,government,rescue_agency',
            'registration_number' => 'required|string|max:100|unique:organizations,registration_number',
            'email' => 'required|email|max:150|unique:organizations,email',
            'phone' => 'required|string|max:30',
            'area' => 'required|string|max:100',
            'description' => 'nullable|string|max:1000',
        ]);

        $validated['status'] = 'active';

        $organization = Organization::create($validated);

        return response()->json([
            'message' => 'Organization registered successfully.',
            'data' => $organization,
        ], 201);
    }

    /**
     * Update organization details.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $organization = Organization::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:200',
            'type' => 'sometimes|required|in:ngo,hospital,government,rescue_agency',
            'phone' => 'sometimes|required|string|max:30',
            'area' => 'sometimes|required|string|max:100',
            'status' => 'sometimes|required|in:active,pending_verification,suspended',
            'description' => 'nullable|string|max:1000',
        ]);

        $organization->update($validated);

        return response()->json([
            'message' => 'Organization updated successfully.',
            'data' => $organization,
        ]);
    }

    /**
     * Resolve the organization context from the authenticated user.
     */
    private function resolveOrganization(Request $request): Organization
    {
        $user = $request->user();

        if (!$user) {
            abort(401, 'Unauthenticated.');
        }

        if ($user->isAdmin() && $request->filled('organization_id')) {
            return Organization::findOrFail((int) $request->query('organization_id'));
        }

        if (!$user->organization_id) {
            abort(403, 'User is not linked to any active organization.');
        }

        return Organization::findOrFail($user->organization_id);
    }

    /**
     * Main Organization Dashboard Endpoint.
     * Computes all 8 metrics, inventory, camps, volunteers, distributions, and recent activities.
     */
    public function dashboard(Request $request): JsonResponse
    {
        $org = $this->resolveOrganization($request);
        $orgId = (int) $org->id;

        // 1. Shelters managed by this organization
        $shelters = Shelter::where('organization_id', $orgId)->get();
        $shelterIds = $shelters->pluck('shelter_id')->toArray();

        // 2. Resources owned by this organization
        $resources = Resource::where('organization_id', $orgId)->get();
        $resourceIds = $resources->pluck('resource_id')->toArray();

        // 3. Emergency Requests linked to this organization
        $requestsQuery = EmergencyRequest::query()->where(function ($q) use ($orgId, $shelterIds) {
            $q->where('organization_id', $orgId);
            if (!empty($shelterIds)) {
                $q->orWhereIn('shelter_id', $shelterIds);
            }
        });
        $allRequests = $requestsQuery->orderByDesc('created_at')->get();

        // 4. Distributions linked to this organization
        $distributionsQuery = Distribution::query()->where(function ($q) use ($orgId, $resourceIds) {
            $q->where('organization_id', $orgId);
            if (!empty($resourceIds)) {
                $q->orWhereIn('resource_id', $resourceIds);
            }
        });
        $allDistributions = $distributionsQuery->with(['resource', 'volunteer'])->orderByDesc('distributed_at')->get();

        // 5. Volunteers in organization's operating area OR assigned to this organization
        $volunteers = Volunteer::where(function ($q) use ($orgId, $org) {
            $q->where('organization_id', $orgId);
            if (!empty($org->area)) {
                $q->orWhere('assigned_area', 'like', '%' . trim($org->area) . '%');
            }
        })->get();

        return response()->json([
            'organization' => [
                'id' => $org->id,
                'name' => $org->name,
                'type' => $org->type,
                'area' => $org->area,
                'registration_number' => $org->registration_number,
                'status' => $org->status,
            ],
            'statistics' => $this->buildMainStatistics($allRequests, $allDistributions, $volunteers, $resources),
            'inventory' => $this->buildInventorySummary($resources),
            'volunteers' => $this->buildVolunteerSummary($volunteers),
            'camps_and_shelters' => $this->buildShelterSummary($shelters),
            'distributions' => $this->buildDistributionSummary($allDistributions),
            'recent_activities' => $this->buildRecentActivities($allRequests, $allDistributions, $volunteers),
        ]);
    }

    private function buildMainStatistics($requests, $distributions, $volunteers, $resources): array
    {
        $approvedRequests = $requests->where('status', 'approved')->count();
        $inProgressDist = $distributions->where('delivery_status', 'in_progress')->count();
        $onDutyVols = $volunteers->where('assignment_status', 'on_duty')->count();

        return [
            'total_emergency_requests' => $requests->count(),
            'pending_requests' => $requests->where('status', 'pending')->count(),
            'active_operations' => $approvedRequests + $inProgressDist + $onDutyVols,
            'completed_requests' => $requests->where('status', 'fulfilled')->count(),
            'available_resources' => (int) $resources->sum('quantity_available'),
            'total_resources_distributed' => (int) $distributions->sum('quantity_distributed'),
            'active_volunteers' => $volunteers->filter(fn($v) => $v->is_available || in_array($v->assignment_status, ['assigned', 'on_duty']))->count(),
            'total_people_assisted' => (int) $requests->where('status', 'fulfilled')->sum('people_affected') + $distributions->where('delivery_status', 'completed')->count(),
        ];
    }

    private function buildInventorySummary($resources): array
    {
        $match = fn($r, $k) => stripos($r->item_name, $k) !== false || stripos($r->category, $k) !== false;
        $lowStock = $resources->filter(fn($r) => $r->quantity_available > 0 && $r->quantity_available < 100)->values();
        $outOfStock = $resources->filter(fn($r) => $r->quantity_available <= 0)->values();

        return [
            'food_packets' => (int) $resources->filter(fn($r) => $match($r, 'food'))->sum('quantity_available'),
            'water_bottles' => (int) $resources->filter(fn($r) => $match($r, 'water'))->sum('quantity_available'),
            'first_aid_kits' => (int) $resources->filter(fn($r) => $match($r, 'first aid'))->sum('quantity_available'),
            'medicine_kits' => (int) $resources->filter(fn($r) => $match($r, 'medicine') || $match($r, 'medical'))->sum('quantity_available'),
            'blankets' => (int) $resources->filter(fn($r) => $match($r, 'blanket') || $match($r, 'bedding'))->sum('quantity_available'),
            'total_available_stock' => (int) $resources->sum('quantity_available'),
            'low_stock_count' => $lowStock->count(),
            'out_of_stock_count' => $outOfStock->count(),
            'low_stock_items' => $lowStock,
            'out_of_stock_items' => $outOfStock,
            'recently_received' => $resources->sortByDesc('last_updated')->take(5)->values(),
            'all_items' => $resources,
        ];
    }

    private function buildVolunteerSummary($volunteers): array
    {
        return [
            'total' => $volunteers->count(),
            'available' => $volunteers->where('is_available', true)->where('assignment_status', 'available')->count(),
            'assigned' => $volunteers->where('assignment_status', 'assigned')->count(),
            'on_duty' => $volunteers->where('assignment_status', 'on_duty')->count(),
            'roster' => $volunteers,
        ];
    }

    private function buildShelterSummary($shelters): array
    {
        $cap = (int) $shelters->sum('capacity');
        $occ = (int) $shelters->sum('current_occupancy');

        return [
            'total_camps' => $shelters->count(),
            'total_capacity' => $cap,
            'current_occupancy' => $occ,
            'available_spaces' => max(0, $cap - $occ),
            'full_camps' => $shelters->filter(fn($s) => $s->status === 'FULL' || $s->current_occupancy >= $s->capacity)->count(),
            'shelters' => $shelters,
        ];
    }

    private function buildDistributionSummary($distributions): array
    {
        $match = fn($d, $k) => $d->resource && (stripos($d->resource->item_name, $k) !== false || stripos($d->resource->category, $k) !== false);

        return [
            'total_distributions' => $distributions->count(),
            'pending_deliveries' => $distributions->where('delivery_status', 'pending')->count(),
            'in_progress_deliveries' => $distributions->where('delivery_status', 'in_progress')->count(),
            'completed_deliveries' => $distributions->where('delivery_status', 'completed')->count(),
            'food_packets_delivered' => (int) $distributions->filter(fn($d) => $match($d, 'food'))->sum('quantity_distributed'),
            'water_bottles_delivered' => (int) $distributions->filter(fn($d) => $match($d, 'water'))->sum('quantity_distributed'),
            'medicine_kits_delivered' => (int) $distributions->filter(fn($d) => $match($d, 'medicine') || $match($d, 'medical'))->sum('quantity_distributed'),
            'recent_ledger' => $distributions->take(8)->values(),
        ];
    }

    private function buildRecentActivities($requests, $distributions, $volunteers): array
    {
        $acts = collect();

        foreach ($requests->take(4) as $req) {
            $acts->push([
                'id' => 'REQ-' . $req->id,
                'type' => 'emergency_request',
                'title' => 'Emergency Request: ' . $req->request_type,
                'description' => "Ticket {$req->request_number} by {$req->requester_name} ({$req->people_affected} affected in {$req->location_name})",
                'status' => $req->status,
                'timestamp' => $req->created_at ? $req->created_at->toIso8601String() : now()->toIso8601String(),
            ]);
        }

        foreach ($distributions->take(4) as $dist) {
            $name = $dist->resource ? $dist->resource->item_name : 'Relief Aid';
            $acts->push([
                'id' => 'DIST-' . $dist->distribution_id,
                'type' => 'distribution',
                'title' => "Dispatched {$dist->quantity_distributed} {$name}",
                'description' => "Request ref: {$dist->request_id}. Status: {$dist->delivery_status}",
                'status' => $dist->delivery_status,
                'timestamp' => $dist->distributed_at ? date('c', strtotime($dist->distributed_at)) : now()->toIso8601String(),
            ]);
        }

        foreach ($volunteers->whereNotNull('current_activity')->take(3) as $vol) {
            $acts->push([
                'id' => 'VOL-' . $vol->volunteer_id,
                'type' => 'volunteer',
                'title' => "Volunteer Task: {$vol->name}",
                'description' => $vol->current_activity,
                'status' => $vol->assignment_status,
                'timestamp' => now()->toIso8601String(),
            ]);
        }

        return $acts->sortByDesc('timestamp')->values()->take(8)->all();
    }

    /**
     * Assign a volunteer to a relief activity.
     */
    public function assignVolunteer(Request $request, int $id): JsonResponse
    {
        $org = $this->resolveOrganization($request);
        $volunteer = Volunteer::findOrFail($id);

        $validated = $request->validate([
            'activity' => 'required|string|max:255',
            'status' => 'required|in:assigned,on_duty,completed,available',
        ]);

        $volunteer->update([
            'current_activity' => $validated['status'] === 'available' ? null : $validated['activity'],
            'assignment_status' => $validated['status'],
            'is_available' => $validated['status'] === 'available',
            'organization_id' => $org->id,
        ]);

        return response()->json([
            'message' => "Volunteer {$volunteer->name} assignment updated successfully.",
            'volunteer' => $volunteer,
        ]);
    }

    /**
     * Store new resource belonging to the organization.
     */
    public function storeResource(Request $request): JsonResponse
    {
        $org = $this->resolveOrganization($request);

        $validated = $request->validate([
            'item_name' => 'required|string|max:100',
            'category' => 'required|string|max:50',
            'quantity_available' => 'required|integer|min:0',
            'unit' => 'nullable|string|max:20',
            'warehouse_location' => 'required|string|max:100',
        ]);

        $validated['organization_id'] = $org->id;
        $validated['last_updated'] = now();

        $resource = Resource::create($validated);

        return response()->json([
            'message' => 'Resource registered to organization inventory.',
            'data' => $resource,
        ], 201);
    }

    /**
     * Update resource stock belonging to this organization.
     */
    public function updateResource(Request $request, int $id): JsonResponse
    {
        $org = $this->resolveOrganization($request);
        $resource = Resource::where('organization_id', $org->id)->findOrFail($id);

        $validated = $request->validate([
            'quantity_available' => 'required|integer|min:0',
            'warehouse_location' => 'sometimes|nullable|string|max:100',
        ]);

        $validated['last_updated'] = now();
        $resource->update($validated);

        return response()->json([
            'message' => "Stock for {$resource->item_name} updated to {$resource->quantity_available} {$resource->unit}.",
            'data' => $resource,
        ]);
    }

    /**
     * Get shelters belonging to the logged-in user's organization.
     */
    public function myShelters(Request $request): JsonResponse
    {
        $org = $this->resolveOrganization($request);
        $shelters = Shelter::where('organization_id', $org->id)->get();

        return response()->json($shelters);
    }

    /**
     * Get warehouse resources belonging to the logged-in user's organization.
     */
    public function myResources(Request $request): JsonResponse
    {
        $org = $this->resolveOrganization($request);
        $resources = Resource::where('organization_id', $org->id)->get();

        return response()->json($resources);
    }

    /**
     * Update camp/shelter occupancy and status.
     */
    public function updateShelterOccupancy(Request $request, int $id): JsonResponse
    {
        $org = $this->resolveOrganization($request);
        $shelter = Shelter::where('organization_id', $org->id)->findOrFail($id);

        $validated = $request->validate([
            'current_occupancy' => 'required|integer|min:0|max:' . $shelter->capacity,
        ]);

        $newOcc = $validated['current_occupancy'];
        $newStatus = ($newOcc >= $shelter->capacity) ? 'FULL' : ($shelter->status === 'FULL' ? 'OPEN' : $shelter->status);

        $shelter->update([
            'current_occupancy' => $newOcc,
            'status' => $newStatus,
        ]);

        return response()->json([
            'message' => "Shelter occupancy updated to {$newOcc} / {$shelter->capacity}.",
            'shelter' => $shelter,
        ]);
    }

    /**
     * Store new distribution dispatch.
     */
    public function storeDistribution(Request $request): JsonResponse
    {
        $org = $this->resolveOrganization($request);

        $validated = $request->validate([
            'request_id' => 'required|string|max:50',
            'resource_id' => 'required|integer|exists:resources,resource_id',
            'quantity_distributed' => 'required|integer|min:1',
            'distributed_by_volunteer_id' => 'nullable|integer|exists:volunteers,volunteer_id',
            'delivery_status' => 'required|in:pending,in_progress,completed',
            'notes' => 'nullable|string|max:500',
        ]);

        $validated['organization_id'] = $org->id;
        $validated['distributed_at'] = now();

        if ($validated['delivery_status'] === 'completed') {
            Resource::where('resource_id', $validated['resource_id'])
                ->decrement('quantity_available', $validated['quantity_distributed']);
        }

        $distribution = Distribution::create($validated);

        return response()->json([
            'message' => 'Distribution dispatch logged successfully.',
            'distribution' => $distribution,
        ], 201);
    }
}
