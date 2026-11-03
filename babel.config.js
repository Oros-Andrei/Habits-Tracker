// Expo's preset keeps the same TypeScript and JSX pipeline across platforms.
module.exports = function (api) {
  api.cache(true);

  return {
    presets: ["babel-preset-expo"],
  };
};
