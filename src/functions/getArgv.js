const getArgv = (name) => {
  const args = process.argv;

  const index = args.findIndex((item) => item === name);

  if (index > -1) {
    const result = args[index + 1];

    if (result && result.length) {
      return result;
    }
  }
  return undefined;
};

module.exports = getArgv;
