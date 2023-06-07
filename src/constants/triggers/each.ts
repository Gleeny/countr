import properties from "../properties";
import type { Trigger } from ".";

const each: Trigger<[number]> = {
  name: "Each X number",
  description: "This will get triggered whenever a user counts a multiple of X. For example, if X is 10, this will trigger on 10, 20, 30 etc.",
  properties: [properties.numberPositive],
  supports: ["flows", "notifications"],
  explanation: ([number]) => `When someone counts a multiple of ${number}, for example ${number}, ${number * 2}, ${number * 3} and so on`,
  check: ({ count }, [number]) => count % number === 0,
};

export default each;
