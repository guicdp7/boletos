function firstUpper(text) {
  if (text) {
    text = text.substring(0, 1).toUpperCase() + text.substring(1);
  }
  return text;
}

module.exports = {
  firstUpper,
};
