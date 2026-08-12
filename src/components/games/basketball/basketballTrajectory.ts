export const getTrajectoryGuideSteps = (level: number, isMobile = false) => {
    let steps = 60;
    if (level === 2) steps = 45;
    else if (level === 3) steps = 30;
    else if (level === 4) steps = 18;
    else if (level === 5) steps = 8;
    else if (level >= 6) steps = 0;

    return isMobile ? Math.min(steps, 36) : steps;
};
