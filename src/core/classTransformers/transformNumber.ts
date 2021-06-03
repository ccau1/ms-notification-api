import { TransformFnParams } from "class-transformer";

export default ({ value }: TransformFnParams) => {
  const newVal = Array.isArray(value)
    ? value.map(parseFloat)
    : parseFloat(value);
  return newVal;
};
