import os from "os";
export const getTempDir = () => {
  return os.tmpdir();
};
