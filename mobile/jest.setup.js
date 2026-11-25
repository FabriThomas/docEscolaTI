const { ligarMock } = require('./src/mock')

ligarMock()

global.alert = jest.fn()
