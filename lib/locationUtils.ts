/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in miles
 */
export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 3959; // Earth's radius in miles (use 6371 for kilometers)
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

/**
 * Calculate ETA based on distance and average speed
 * Returns object with hours and minutes
 */
export function calculateETA(distanceMiles: number, averageSpeedMph: number = 55): {
    hours: number;
    minutes: number;
    totalMinutes: number;
    formattedETA: string;
} {
    const totalHours = distanceMiles / averageSpeedMph;
    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);
    const totalMinutes = Math.round(totalHours * 60);

    // Format ETA string
    let formattedETA = '';
    if (hours > 0) {
        formattedETA = `${hours}h ${minutes}m`;
    } else {
        formattedETA = `${minutes}m`;
    }

    return {
        hours,
        minutes,
        totalMinutes,
        formattedETA
    };
}

/**
 * Format distance for display
 */
export function formatDistance(miles: number): string {
    if (miles < 0.1) {
        return `${Math.round(miles * 5280)} ft`; // Convert to feet for very short distances
    }
    return `${miles.toFixed(1)} mi`;
}

/**
 * Calculate arrival time from current time
 */
export function calculateArrivalTime(etaMinutes: number): Date {
    const arrival = new Date();
    arrival.setMinutes(arrival.getMinutes() + etaMinutes);
    return arrival;
}

/**
 * Format arrival time
 */
export function formatArrivalTime(arrivalTime: Date): string {
    return arrivalTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

/**
 * Get route information between two points
 */
export function getRouteInfo(
    currentLat: number,
    currentLon: number,
    destLat: number,
    destLon: number,
    averageSpeedMph: number = 55
) {
    const distance = calculateDistance(currentLat, currentLon, destLat, destLon);
    const eta = calculateETA(distance, averageSpeedMph);
    const arrivalTime = calculateArrivalTime(eta.totalMinutes);

    return {
        distance,
        distanceFormatted: formatDistance(distance),
        eta: eta.formattedETA,
        etaMinutes: eta.totalMinutes,
        arrivalTime,
        arrivalTimeFormatted: formatArrivalTime(arrivalTime)
    };
}
