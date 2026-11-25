<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Distribution extends Model
{
    protected $table = 'distributions';

    protected $primaryKey = 'distribution_id';

    public $timestamps = false;

    protected $fillable = [
        'request_id',
        'resource_id',
        'organization_id',
        'quantity_distributed',
        'distributed_by_volunteer_id',
        'delivery_status',
        'distributed_at',
        'notes',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id', 'id');
    }

    public function resource(): BelongsTo
    {
        return $this->belongsTo(Resource::class, 'resource_id', 'resource_id');
    }

    public function volunteer(): BelongsTo
    {
        return $this->belongsTo(Volunteer::class, 'distributed_by_volunteer_id', 'volunteer_id');
    }
}
