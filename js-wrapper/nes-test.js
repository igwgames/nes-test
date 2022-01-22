class NesTest {

    constructor() {

    }

    getRamValue(addr) {
        return {type: 'cpu', address: addr}
    }
}

module.exports = new NesTest();