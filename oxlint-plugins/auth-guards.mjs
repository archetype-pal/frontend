// The auth token is an HttpOnly cookie: browser code can neither read it nor
// send it. Authenticated browser calls go through `/api/proxy` (`proxyFetch`).
// `.oxlintrc.json` exempts the server files that legitimately do both.

const AUTH_HEADER_MESSAGE =
  'Browser code must not send the auth token; use proxyFetch, or authFetch on the server.';

const isAuthorization = (value) => typeof value === 'string' && /^authorization$/i.test(value);

const noDocumentCookie = {
  meta: { type: 'problem', schema: [] },
  create(context) {
    return {
      MemberExpression(node) {
        if (
          node.object.type === 'Identifier' &&
          node.object.name === 'document' &&
          node.property.type === 'Identifier' &&
          node.property.name === 'cookie'
        ) {
          context.report({
            node,
            message: 'The auth cookie is HttpOnly; read sign-in state from useAuth().',
          });
        }
      },
    };
  },
};

const noAuthHeader = {
  meta: { type: 'problem', schema: [] },
  create(context) {
    const report = (node) => context.report({ node, message: AUTH_HEADER_MESSAGE });
    return {
      // 'Authorization' as a string, e.g. headers.set('Authorization', …).
      Literal(node) {
        if (isAuthorization(node.value)) report(node);
      },
      // { Authorization: … }
      Property(node) {
        if (!node.computed && node.key.type === 'Identifier' && isAuthorization(node.key.name)) {
          report(node.key);
        }
      },
      // `Token ${token}`
      TemplateElement(node) {
        if (node.value.raw.startsWith('Token ')) report(node);
      },
      // 'Token ' + token
      BinaryExpression(node) {
        if (node.operator !== '+') return;
        for (const side of [node.left, node.right]) {
          if (side.type === 'Literal' && side.value === 'Token ') report(side);
        }
      },
    };
  },
};

const authGuards = {
  meta: { name: 'auth-guards' },
  rules: { 'no-document-cookie': noDocumentCookie, 'no-auth-header': noAuthHeader },
};

export default authGuards;
