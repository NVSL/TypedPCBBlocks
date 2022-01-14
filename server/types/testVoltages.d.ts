import { powerMatNode } from './tscheda';
import { tsch } from './tsch';
declare const test: {
    tschVoltages: (mat: powerMatNode, tsch: tsch) => {
        voutProtocol: string;
        vinProtocol: string;
    } | null;
    matVoltages: (parentMat: powerMatNode, childMat: powerMatNode) => {
        voutProtocol: string;
        vinProtocol: string;
    } | null;
};
export { test };
