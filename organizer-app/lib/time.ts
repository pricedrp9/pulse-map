export const TimeZone = {
    // Get local timezone
    getLocal: () => Intl.DateTimeFormat().resolvedOptions().timeZone,
};

// Convert a local date object to a UTC ISO string
export const toUTC = (date: Date) => {
    return date.toISOString();
};

// Convert a UTC ISO string to a local Date object
export const toLocal = (isoString: string) => {
    return new Date(isoString);
};

// Format for display (Simple)
export const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
};
