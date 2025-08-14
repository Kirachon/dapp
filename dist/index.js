"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const cors_1 = __importDefault(require("@fastify/cors"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const server_1 = require("@apollo/server");
const fastify_2 = require("@as-integrations/fastify");
const schema_1 = require("@graphql-tools/schema");
async function start() {
    const server = (0, fastify_1.default)({ logger: true });
    // Security & CORS
    await server.register(helmet_1.default);
    await server.register(cors_1.default, { origin: true, credentials: true });
    await server.register(rate_limit_1.default, { max: 100, timeWindow: '1 minute' });
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
            me: (_, __, ctx) => ctx.user ?? null,
        },
    };
    const schema = (0, schema_1.makeExecutableSchema)({ typeDefs, resolvers });
    const apollo = new server_1.ApolloServer({
        schema,
        plugins: [(0, fastify_2.fastifyApolloDrainPlugin)(server)],
    });
    await apollo.start();
    server.route({
        url: '/graphql',
        method: ['GET', 'POST', 'OPTIONS'],
        handler: (0, fastify_2.fastifyApolloHandler)(apollo, {
            context: async () => ({ /* TODO: auth user from session/JWT */}),
        }),
    });
    const port = Number(process.env.PORT ?? 8080);
    try {
        await server.listen({ port, host: '0.0.0.0' });
        server.log.info(`API listening on :${port}`);
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
}
start();
//# sourceMappingURL=index.js.map