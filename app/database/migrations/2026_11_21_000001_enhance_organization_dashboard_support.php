<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations to support organization-level data isolation and delivery tracking.
     */
    public function up(): void
    {
        // 1. Add organization_id to emergency_requests
        if (Schema::hasTable('emergency_requests')) {
            Schema::table('emergency_requests', function (Blueprint $table) {
                if (!Schema::hasColumn('emergency_requests', 'organization_id')) {
                    $table->foreignId('organization_id')
                        ->nullable()
                        ->after('shelter_id')
                        ->constrained('organizations')
                        ->nullOnDelete();
                }
            });
        }

        // 2. Add organization_id, assignment_status, current_activity to volunteers
        if (Schema::hasTable('volunteers')) {
            Schema::table('volunteers', function (Blueprint $table) {
                if (!Schema::hasColumn('volunteers', 'organization_id')) {
                    $table->foreignId('organization_id')
                        ->nullable()
                        ->after('assigned_area')
                        ->constrained('organizations')
                        ->nullOnDelete();
                }
                if (!Schema::hasColumn('volunteers', 'assignment_status')) {
                    $table->string('assignment_status', 50)->default('available')->after('is_available');
                }
                if (!Schema::hasColumn('volunteers', 'current_activity')) {
                    $table->string('current_activity', 255)->nullable()->after('assignment_status');
                }
            });
        }

        // 3. Add organization_id and delivery_status to distributions
        if (Schema::hasTable('distributions')) {
            Schema::table('distributions', function (Blueprint $table) {
                if (!Schema::hasColumn('distributions', 'organization_id')) {
                    $table->foreignId('organization_id')
                        ->nullable()
                        ->after('distributed_by_volunteer_id')
                        ->constrained('organizations')
                        ->nullOnDelete();
                }
                if (!Schema::hasColumn('distributions', 'delivery_status')) {
                    $table->string('delivery_status', 50)->default('completed')->after('notes');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('emergency_requests')) {
            Schema::table('emergency_requests', function (Blueprint $table) {
                if (Schema::hasColumn('emergency_requests', 'organization_id')) {
                    $table->dropForeign(['organization_id']);
                    $table->dropColumn('organization_id');
                }
            });
        }

        if (Schema::hasTable('volunteers')) {
            Schema::table('volunteers', function (Blueprint $table) {
                if (Schema::hasColumn('volunteers', 'organization_id')) {
                    $table->dropForeign(['organization_id']);
                    $table->dropColumn(['organization_id', 'assignment_status', 'current_activity']);
                }
            });
        }

        if (Schema::hasTable('distributions')) {
            Schema::table('distributions', function (Blueprint $table) {
                if (Schema::hasColumn('distributions', 'organization_id')) {
                    $table->dropForeign(['organization_id']);
                    $table->dropColumn(['organization_id', 'delivery_status']);
                }
            });
        }
    }
};
