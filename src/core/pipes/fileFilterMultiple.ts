import { BadRequestException } from "@nestjs/common";

export const fileFilterMultiple = (
  rules:
    | Array<{
        fieldName: string[];
        extensions: string[];
        errorMessage?: string;
      }>
    | {
        fieldName: string[];
        extensions: string[];
        errorMessage?: string;
      }
) => (req, file, callback) => {
  if (!Array.isArray(rules)) {
    rules = [rules];
  }
  for (const rule of rules) {
    if (
      rule.fieldName.includes(file.fieldname) &&
      !new RegExp(`\.(${rule.extensions.join("|")})$`, "i").test(
        file.originalname
      )
    ) {
      return callback(
        new BadRequestException(
          rule.errorMessage ||
            `Incorrect file type for field '${
              file.fieldname
            }'. Expecting extensions: ${rule.extensions.join(", ")}`
        ),
        false
      );
    }
  }
  callback(null, true);
};
