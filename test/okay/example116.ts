// Correct: Namespace usage
namespace Utils {
  export function log(msg: string): void {
    console.log(msg);
  }
}

Utils.log("Hello");
