type net = boolean;

interface SPI {
    MISO: boolean;
    MOSI: boolean;
    SCK: boolean;
}

class POWER {
    netVoltage: number | null = null
    sourceVoltage: number | null = null
    constructor(props: PROPS) {
        this.sourceVoltage = props.sourceVoltage;
    }
}

interface PROPS {
    sourceVoltage: number;
} 


class SPI extends POWER { 
    MISO: net = false;
    MOSI: net = false;
    SCK: net = false;
    constructor(props: PROPS) {
        super(props)
        console.log(props)
    }
    public connect(net2: SPI): boolean {
        // Add constrains
        return false;
    }
}


// Net connect checker
const jsonTypedTest = {
    MISO : true,
    MOSI : true,
    netVoltage: 5
}

const porps: PROPS = {
    sourceVoltage: 3.3
}

const iface = Object.assign( new SPI(porps), jsonTypedTest )
console.log(iface)
// const spi = new SPI(jsonTypedTest)




const jsonTypedSchematic = {"SPI-0": [
    {
        "ALTNAME": "0",
        "NET": "#SPI0.MOSI||#GPIO11",
        "SIGNAL": "MOSI",
        "TYPE": "SPI",
        "VOLTAGE": "",
        "VOLTAGE_LIST": "",
        "VOLTAGE_RANGE": ""
    },
    {
        "ALTNAME": "0",
        "NET": "#SPI0.MISO||#GPIO12",
        "SIGNAL": "MISO",
        "TYPE": "SPI",
        "VOLTAGE": "",
        "VOLTAGE_LIST": "",
        "VOLTAGE_RANGE": ""
    },
    {
        "ALTNAME": "0",
        "NET": "#SPI0.SCK||#GPIO13",
        "SIGNAL": "SCK",
        "TYPE": "SPI",
        "VOLTAGE": "",
        "VOLTAGE_LIST": "",
        "VOLTAGE_RANGE": ""
    }
]}
