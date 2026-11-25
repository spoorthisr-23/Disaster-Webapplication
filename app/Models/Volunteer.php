<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Volunteer extends Model
{
    protected $table = 'volunteers';

    protected $primaryKey = 'volunteer_id';

    public $timestamps = false;

    protected $fillable = [
        'name',
        'phone',
        'skills',
        'assigned_area',
        'organization_id',
        'is_available',
        'assignment_status',
        'current_activity',
        'created_at',
    ];

    protected $casts = [
        'is_available' => 'boolean',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id', 'id');
    }

    public function distributions(): HasMany
    {
        return $this->hasMany(Distribution::class, 'distributed_by_volunteer_id', 'volunteer_id');
    }
}
