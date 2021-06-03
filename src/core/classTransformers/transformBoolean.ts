import { TransformFnParams } from "class-transformer";

export default ({ value }: TransformFnParams) => {
  return value === "" || value.toString().toLowerCase() === "true"
    ? true
    : false;
};
