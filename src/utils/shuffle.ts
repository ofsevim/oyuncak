/**
 * Fisher-Yates shuffle algorithm to shuffle an array.
 */
export const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

/**
 * Shuffles an array but ensures no two adjacent items share the same value for a given key.
 * Useful for round-based games where you don't want similar categories back-to-back.
 */
export const smartShuffle = <T,>(array: T[], key?: keyof T): T[] => {
    if (array.length <= 1) return [...array];

    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
        const shuffled = shuffleArray(array);
        let hasConsecutive = false;
        for (let i = 0; i < shuffled.length - 1; i++) {
            const current = key ? shuffled[i][key] : shuffled[i];
            const next = key ? shuffled[i + 1][key] : shuffled[i + 1];

            if (current === next) {
                hasConsecutive = true;
                break;
            }
        }

        if (!hasConsecutive) {
            return shuffled;
        }
        attempts++;
    }

    // Fallback if we couldn't find a perfect configuration
    return shuffleArray(array);
};

/**
 * Returns a random item from an array that is different from the last one.
 */
export const getNextRandom = <T,>(array: T[], lastItem: T | null, key?: keyof T): T => {
    if (array.length === 0) throw new Error("Array is empty");
    if (array.length === 1) return array[0];

    const filtered = array.filter(item => {
        if (lastItem === null) return true;
        const currentVal = key ? item[key] : item;
        const lastVal = key ? lastItem[key] : lastItem;
        return currentVal !== lastVal;
    });

    return filtered[Math.floor(Math.random() * filtered.length)];
};

/**
 * Returns a random index that is different from the last one.
 */
export const getNextRandomIndex = (max: number, lastIndex: number | null): number => {
    if (max <= 1) return 0;
    let nextIndex;
    do {
        nextIndex = Math.floor(Math.random() * max);
    } while (nextIndex === lastIndex);
    return nextIndex;
};
