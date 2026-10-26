import { Vector } from "./vector";
import { clamp } from "./common";
import { FilterAlgorithm } from "../filter-algorithm";

enum SIDE {
    RIGHT = 'Right',
    LEFT = 'Left',
}

/**
 * Calculates arm rotation as euler angles
 * @param {Array} lm : array of 3D pose vectors from tfjs or mediapipe
 */
export const calcArms = (lm: any) => {
    //Pure Rotation Calculations
    const UpperArm = {
        r: Vector.findRotation(lm[11], lm[13]),
        l: Vector.findRotation(lm[12], lm[14]),
    };
    UpperArm.r.y = Vector.angleBetween3DCoords(lm[12], lm[11], lm[13]);
    UpperArm.l.y = Vector.angleBetween3DCoords(lm[11], lm[12], lm[14]);

    /*
     * LOWER ARM
     */
    const LowerArm = {
        r: Vector.findRotation(lm[13], lm[15]),
        l: Vector.findRotation(lm[14], lm[16]),
    };
    LowerArm.r.y = Vector.angleBetween3DCoords(lm[11], lm[13], lm[15]);
    LowerArm.l.y = Vector.angleBetween3DCoords(lm[12], lm[14], lm[16]);
    LowerArm.r.z = clamp(LowerArm.r.z, -2.14, 0);
    LowerArm.l.z = clamp(LowerArm.l.z, -2.14, 0);

    /*
     * HAND
     */
    const Hand = {
        r: Vector.findRotation(
            Vector.fromArray(lm[15]),
            Vector.lerp(Vector.fromArray(lm[17]), Vector.fromArray(lm[19]), 0.5)
        ),
        l: Vector.findRotation(
            Vector.fromArray(lm[16]),
            Vector.lerp(Vector.fromArray(lm[18]), Vector.fromArray(lm[20]), 0.5)
        ),
    };

    //Modify Rotations slightly for more natural movement
    const rightArmRig = rigArm(UpperArm.r, LowerArm.r, Hand.r, SIDE.RIGHT);
    const leftArmRig = rigArm(UpperArm.l, LowerArm.l, Hand.l, SIDE.LEFT);

    return {
        //Scaled
        UpperArm: filterData('UpperArm', {
            r: rightArmRig.UpperArm,
            l: leftArmRig.UpperArm,
        }),
        LowerArm: filterData('LowerArm', {
            r: rightArmRig.LowerArm,
            l: leftArmRig.LowerArm,
        }),
        Hand: filterData('Hand', {
            r: rightArmRig.Hand,
            l: leftArmRig.Hand,
        }),
        //Unscaled
        Unscaled: {
            UpperArm: filterData('UpperArm_Unscaled', UpperArm),
            LowerArm: filterData('LowerArm_Unscaled', LowerArm),
            Hand: filterData('Hand_Unscaled', Hand),
        },
    };
};

/**
 * Converts normalized rotation values into radians clamped by human limits
 * @param {Object} UpperArm : normalized rotation values
 * @param {Object} LowerArm : normalized rotation values
 * @param {Object} Hand : normalized rotation values
 * @param {Side} side : left or right
 */
export const rigArm = (UpperArm: Vector, LowerArm: Vector, Hand: Vector, side: SIDE = SIDE.RIGHT) => {
    // Invert modifier based on left vs right side
    const invert = side === SIDE.RIGHT ? 1 : -1;

    UpperArm.z *= -2.3 * invert;
    //Modify UpperArm rotationY  by LowerArm X and Z rotations
    UpperArm.y *= Math.PI * invert;
    UpperArm.y -= Math.max(LowerArm.x);
    UpperArm.y -= -invert * Math.max(LowerArm.z, 0);
    UpperArm.x -= 0.3 * invert;

    LowerArm.z *= -2.14 * invert;
    LowerArm.y *= 2.14 * invert;
    LowerArm.x *= 2.14 * invert;

    //Clamp values to human limits
    UpperArm.x = clamp(UpperArm.x, -0.5, Math.PI);
    LowerArm.x = clamp(LowerArm.x, -0.3, 0.3);

    Hand.y = clamp(Hand.z * 2, -0.6, 0.6); //side to side
    Hand.z = Hand.z * -2.3 * invert; //up down

    return {
        //Returns Values in Radians for direct 3D usage
        UpperArm: UpperArm,
        LowerArm: LowerArm,
        Hand: Hand,
    };
};

/**
 * 过一次滤波
 */
function filterData(name: string, data: { l: Vector, r: Vector }) {
    return {
        l: filterVectorData(name + '_l', data.l),
        r: filterVectorData(name + '_r', data.r),
    };
}

/**
 * 过一次滤波
 */
function filterVectorData(name: string, v: Vector) {
    const filterX = FilterAlgorithm.getInstance(name + '_x');
    const filterY = FilterAlgorithm.getInstance(name + '_y');
    const filterZ = FilterAlgorithm.getInstance(name + '_z');
    v.x = filterX.getNum(v.x);
    v.y = filterY.getNum(v.y);
    v.z = filterZ.getNum(v.z);
    return v;
}
