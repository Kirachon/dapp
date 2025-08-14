import fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { ApolloServer } from '@apollo/server';
import { fastifyApolloDrainPlugin, fastifyApolloHandler } from '@as-integrations/fastify';
import { makeExecutableSchema } from '@graphql-tools/schema';

async function start() {
  const server = fastify({ logger: true });

  // Security & CORS
  await server.register(helmet);
  await server.register(cors, { origin: true, credentials: true });
  await server.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  // REST health endpoints
  server.get('/health', async () => ({ status: 'ok' }));
  server.get('/ready', async () => ({ status: 'ready' }));

  // GraphQL schema
  const typeDefs = /* GraphQL */ `
    type Query {
      health: String!
      me: Me
    }
    type Me {
      id: ID!
      email: String!
      roles: [String!]!
    }
  `;

  const resolvers = {
    Query: {
      health: () => 'ok',
      me: (_: unknown, __: unknown, ctx: { user?: any }) => ctx.user ?? null,
    },
  };

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const apollo = new ApolloServer({
    schema,
    plugins: [fastifyApolloDrainPlugin(server)],
  });
  await apollo.start();

  server.route({
    url: '/graphql',
    method: ['GET', 'POST', 'OPTIONS'],
    handler: fastifyApolloHandler(apollo, {
      context: async () => ({ /* TODO: auth user from session/JWT */ }),
    }),
  });

  const port = Number(process.env.PORT ?? 8080);
  try {
    await server.listen({ port, host: '0.0.0.0' });
    server.log.info(`API listening on :${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();

