<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmergencyRequest extends Model
{
    protected $table = 'emergency_requests';

    protected $fillable = [
        'request_number',
        'disaster_event_id',
        'request_type',
        'description',
        'location_name',
        'shelter_id',
        'organization_id',
        'people_affected',
        'priority',
        'status',
        'requester_name',
        'requester_phone',
    ];

    public function shelter(): BelongsTo
    {
        return $this->belongsTo(Shelter::class, 'shelter_id', 'shelter_id');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id', 'id');
    }

    public function disasterEvent(): BelongsTo
    {
        return $this->belongsTo(DisasterEvent::class, 'disaster_event_id', 'id');
    }
}
