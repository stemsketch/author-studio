import { AuthorServicesClient } from "./client.js";
import { registerAuthorStudio } from "./register.js";
import type { ExtensionContextLike, VscodeLike } from "./register.js";
import { AuthorStudio } from "./studio.js";

const TOKEN_SECRET = "stemsketch.authorServices.token";

export function activateWith(
  api: VscodeLike,
  context: ExtensionContextLike,
  client?: AuthorServicesClient,
): AuthorStudio {
  let token: string | undefined;
  void context.secrets.get(TOKEN_SECRET).then((value) => {
    token = value;
  });
  const resolved =
    client ??
    new AuthorServicesClient({
      baseUrl: api.workspace
        .getConfiguration("stemsketch")
        .get("authorServices.url", "http://127.0.0.1:8787"),
      getToken: () => token,
    });
  const studio = new AuthorStudio(resolved);
  registerAuthorStudio(api, context, studio);
  return studio;
}
