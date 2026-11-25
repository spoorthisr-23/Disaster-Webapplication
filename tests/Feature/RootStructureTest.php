<?php

namespace Tests\Feature;

use App\Http\Controllers\ShelterController;
use App\Models\Shelter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class RootStructureTest extends TestCase
{
    public function test_spa_root_and_login_routes_serve_compiled_frontend(): void
    {
        $rootResponse = $this->get('/');
        $rootResponse->assertStatus(200);

        $loginResponse = $this->get(route('login'));
        $loginResponse->assertStatus(200);

        $indexPath = public_path('index.html');
        $this->assertFileExists($indexPath);
        $this->assertStringContainsString('<div id="root"></div>', file_get_contents($indexPath));
    }

    public function test_api_routes_and_models_resolve_from_laravel_root(): void
    {
        $this->assertTrue(class_exists(Shelter::class));
        $this->assertSame('shelters', (new Shelter())->getTable());

        $matched = Route::getRoutes()->match(Request::create('/api/shelters', 'GET'));
        $this->assertSame(ShelterController::class.'@index', $matched->getActionName());
    }

    public function test_standard_laravel_root_layout_has_no_wrapper_directories(): void
    {
        $this->assertFileExists(base_path('artisan'));
        $this->assertFileExists(base_path('composer.json'));
        $this->assertFileExists(public_path('index.php'));
        $this->assertDirectoryDoesNotExist(base_path('Backend'));
        $this->assertDirectoryDoesNotExist(base_path('Frontend'));
    }
}
