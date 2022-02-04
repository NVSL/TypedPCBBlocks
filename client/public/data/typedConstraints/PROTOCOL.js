// Power variables
class POWER {
    netVoltage = null;
    sourceVoltage = null;
    constructor(sourceVoltage) {
        this.sourceVoltage = sourceVoltage;
    }
    voltagesFit(v1, v2) {
        let voltageOne;
        let voltageTwo;
        switch (v1.type) {
            case 'number':
                voltageOne = v1.value;
                switch (v2.type) {
                    case 'number':
                        voltageTwo = v2.value;
                        if (voltageOne == voltageTwo) {
                            // console.log(
                            //   `CONNECTION VOLTAGES { ${voltageOne} , ${voltageTwo} } FIT`,
                            //   'number, number',
                            // );
                            return true;
                        }
                        break;
                    case 'range':
                        voltageTwo = v2.value;
                        if (voltageOne >= voltageTwo.min && voltageOne <= voltageTwo.max) {
                            // console.log(
                            //   `CONNECTION VOLTAGES { ${voltageOne} , ${voltageTwo} } FIT`,
                            //   'number, range',
                            // );
                            return true;
                        }
                        break;
                    default:
                        break;
                }
                break;
            case 'range':
                voltageOne = v1.value;
                switch (v2.type) {
                    case 'number':
                        // A specific voltage should not be connected to range of voltage outputs.
                        break;
                    case 'range':
                        voltageTwo = v2.value;
                        // voltages In ranges inside voltage Out ranges
                        if (voltageTwo.min >= voltageOne.min &&
                            voltageTwo.max <= voltageOne.max) {
                            // console.log(
                            //   `CONNECTION VOLTAGES { ${voltageOne} , ${voltageTwo} } FIT`,
                            //   'range, range',
                            // );
                            return true;
                        }
                        break;
                    default:
                        break;
                }
                break;
            default:
                break;
        }
        return false;
    }
}
const ok = (res) => {
    return [res, null];
};
const error = (msg) => {
    return [null, msg];
};
export { POWER, ok, error };
