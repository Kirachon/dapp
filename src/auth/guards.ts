export type GraphQLResolver<Parent = any, Args = any, Context = any, Info = any> = (
  parent: Parent,
  args: Args,
  context: Context,
  info: Info,
) => any | Promise<any>;

/**
 * requireAuth: Wrap a resolver to ensure an authenticated user is present in context.
 * Throws an Error('Unauthenticated') if no authenticated user exists.
 */
export const requireAuth = <P = any, A = any, C = any, I = any>(
  resolver: GraphQLResolver<P, A, C, I>,
): GraphQLResolver<P, A, C, I> => {
  return async (parent: P, args: A, context: any, info: I) => {
    if (!context?.user?.id) {
      throw new Error('Unauthenticated');
    }
    return resolver(parent, args, context, info);
  };
};
