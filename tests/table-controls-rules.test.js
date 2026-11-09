test('poker and Spades practice rules reject illegal moves and settle complete hands', () => {
  jest.isolateModules(() => { require('../scripts/check-table-rules.js'); });
});
