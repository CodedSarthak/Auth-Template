export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(
        message: string,
        statusCode: number,
        isOperational = true
    ) {
        super(message);

        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        Error.captureStackTrace(this, this.constructor);
    }
}

export class BadRequestException extends AppError {
    constructor(message = "Bad Request") {
        super(message, 400);
    }
}

export class UnauthorizedException extends AppError {
    constructor(message = "Unauthorized") {
        super(message, 401);
    }
}

export class ForbiddenException extends AppError {
    constructor(message = "Forbidden") {
        super(message, 403);
    }
}

export class NotFoundException extends AppError {
    constructor(message = "Resource not found") {
        super(message, 404);
    }
}

export class ConflictException extends AppError {
    constructor(message = "Conflict") {
        super(message, 409);
    }
}

export class TooManyRequestsException extends AppError {
    constructor(message = "Too many requests") {
        super(message, 429);
    }
}

export class InternalServerException extends AppError {
    constructor(message = "Internal server error") {
        super(message, 500);
    }
}

export class UnprocessableEntityException extends AppError {
    constructor(message = "Unprocessable Entity") {
        super(message, 422);
    }
}