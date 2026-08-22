const swaggerJsdoc = require("swagger-jsdoc");

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Backend Assignment API Documentation",
            version: "1.0.0",
            description: "API Documentation including Public routes and Protected routes linked with Bearer security scheme."
        },
        servers: [
            {
                url: "http://localhost:3000",
                description: "Local Server"
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT"
                }
            }
        },
        paths: {
            "/auth/signup": {
                post: {
                    summary: "User Registration",
                    tags: ["Auth"],
                    description: "Registers a new user with email and password.",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    required: ["email", "password"],
                                    properties: {
                                        email: { type: "string", example: "rohith@example.com" },
                                        password: { type: "string", example: "password123" }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        201: { description: "User created successfully" },
                        400: { description: "Missing email or password" }
                    }
                }
            },
            "/auth/login": {
                post: {
                    summary: "User Login",
                    tags: ["Auth"],
                    description: "Authenticates user and returns JWT access token.",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    required: ["email", "password"],
                                    properties: {
                                        email: { type: "string", example: "rohith@example.com" },
                                        password: { type: "string", example: "password123" }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        200: { description: "Successful login, returns JWT token" },
                        400: { description: "Missing email or password" },
                        401: { description: "Invalid credentials" }
                    }
                }
            },
            "/public/info": {
                get: {
                    summary: "Public Info",
                    tags: ["Public"],
                    description: "Public route returning welcome message.",
                    responses: {
                        200: { description: "Returns Welcome stranger!" }
                    }
                }
            },
            "/protected/profile": {
                get: {
                    summary: "User Profile (Protected)",
                    tags: ["Protected"],
                    description: "Protected route returning user profile.",
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: "Returns user profile" },
                        401: { description: "Missing or invalid token" }
                    }
                }
            },
            "/protected/dashboard": {
                get: {
                    summary: "User Dashboard (Protected)",
                    tags: ["Protected"],
                    description: "Protected route returning dashboard info.",
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: "Returns user dashboard" },
                        401: { description: "Missing or invalid token" }
                    }
                }
            },
            "/auth/logout": {
                post: {
                    summary: "User Logout (Protected)",
                    tags: ["Auth"],
                    description: "Logs out the user session.",
                    security: [{ bearerAuth: [] }],
                    responses: {
                        204: { description: "Successfully logged out" },
                        401: { description: "Missing or invalid token" }
                    }
                }
            }
        }
    },
    apis: ["./routes/*.js", "./server.js"]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
