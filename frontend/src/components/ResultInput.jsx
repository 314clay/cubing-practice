export function ResultInput({
  crossSuccess,
  blindfolded,
  pairsPlanned,
  pairsAttempting,
  onCrossSuccess,
  onBlindfolded,
  onPairsPlanned
}) {
  const handleSuccess = (isBlind = false) => {
    onCrossSuccess(true);
    onBlindfolded(isBlind);
    if (pairsAttempting > 0) {
      onPairsPlanned(pairsAttempting);
    }
  };

  const handleFail = () => {
    onCrossSuccess(false);
    onBlindfolded(false);
    if (pairsAttempting > 0) {
      onPairsPlanned(0);
    }
  };

  const handlePairsClick = (n) => {
    onPairsPlanned(n);
    // Auto-set cross result if not already set
    if (crossSuccess === null) {
      if (n >= pairsAttempting) {
        onCrossSuccess(true);
        onBlindfolded(false);
      } else {
        onCrossSuccess(false);
        onBlindfolded(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-gray-400 mb-3">Cross Result:</div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => handleSuccess(false)}
            className={`px-6 py-3 rounded-lg font-medium text-lg transition-all ${
              crossSuccess === true && !blindfolded
                ? 'bg-green-600 text-white ring-2 ring-green-400'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Success (s)
          </button>
          <button
            onClick={() => handleSuccess(true)}
            className={`px-6 py-3 rounded-lg font-medium text-lg transition-all ${
              crossSuccess === true && blindfolded
                ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Blind (b)
          </button>
          <button
            onClick={handleFail}
            className={`px-6 py-3 rounded-lg font-medium text-lg transition-all ${
              crossSuccess === false
                ? 'bg-red-600 text-white ring-2 ring-red-400'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Fail (f)
          </button>
        </div>
      </div>

      {pairsAttempting > 0 && (
        <div>
          <div className="text-sm text-gray-400 mb-3">
            Pairs Planned (attempting {pairsAttempting}):
          </div>
          <div className="flex gap-2 justify-center items-center">
            {/* Standard buttons: 0 through pairsAttempting */}
            {Array.from({ length: pairsAttempting + 1 }, (_, i) => (
              <button
                key={i}
                onClick={() => handlePairsClick(i)}
                className={`w-12 h-12 rounded-lg font-medium text-lg transition-all ${
                  pairsPlanned === i
                    ? 'bg-yellow-600 text-white ring-2 ring-yellow-400'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {i}
              </button>
            ))}
            {/* Extra buttons beyond pairsAttempting, up to 4 */}
            {pairsAttempting < 4 && (
              <>
                <span className="text-gray-600 mx-1">|</span>
                {Array.from({ length: 4 - pairsAttempting }, (_, i) => {
                  const value = pairsAttempting + 1 + i;
                  return (
                    <button
                      key={value}
                      onClick={() => handlePairsClick(value)}
                      className={`w-10 h-10 rounded-lg font-medium text-sm transition-all ${
                        pairsPlanned === value
                          ? 'bg-yellow-700 text-yellow-100 ring-2 ring-yellow-500'
                          : 'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-400'
                      }`}
                      title={`+${value - pairsAttempting} extra`}
                    >
                      {value}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
