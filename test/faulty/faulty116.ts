// Error: Namespace member access
namespace Utils {
  export function log(msg: string): void {
    console.log(msg);
  }
}

Utils.print("Hello");
