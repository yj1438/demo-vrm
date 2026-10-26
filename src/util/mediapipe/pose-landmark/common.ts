export const clamp = (val: number, min: number, max: number) => {
    return Math.max(Math.min(val, max), min);
};

export const remap = (val: number, min: number, max: number) => {
    //returns min to max -> 0 to 1
    return (clamp(val, min, max) - min) / (max - min);
};