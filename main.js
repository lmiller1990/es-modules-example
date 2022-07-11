import { hello } from "./hello.js"

export async function main () {

  // works great!
  hello('Static import')

  // be a cool guy and import async ala "dynamic module"
  try {
    const mod = await import("./broken.js")
  } catch (e) {
    console.log('Could not import module!')
  }

  // no problem, since we did try/catch. Life goes on.
  hello('Hello from after a failed dynamic import!')
}
