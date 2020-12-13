
class HttpError extends Error {
    /**
     *
     * @param {number} status status da resposta
     * @param {string} message mensagem a ser inclusa dentro de `error` no corpo da resposta
     */
    constructor (status, message) {
        super(message);
        this.status = parseInt(status) || 500;
    }
}


/**
 * @callback routeHandler
 * @param {import('express').Request} req HTTP Request (from Express)
 * @returns {any} Must be anything serializable to JSON or undefined or an Error.
 * Can also be a Promise which resolves to those things or rejects to an Error.
 * Can also throw an Error.
 */

/**
 *
 * @param {routeHandler} handler Route handler
 * @returns {import('express').RequestHandler}
 *
 */
const defaultRoute = handler => async (req, res) => {
    try {
        const ans = await handler(req);
        if (ans instanceof Error)
            throw ans;
        if (ans === undefined)
                return res.status(204).end();
        else if (ans === null)
            return res.status(404).json(ans);
        else
            return res.status(200).json(ans);
    } catch (err) {
        console.error(err.toString());
        let status = 500;
        if (err instanceof HttpError) status = err.status;

        return res.status(status).json({
            error: err.name,
            message: err.message,
        });
    }
}

module.exports = {
    defaultRoute,
    HttpError,
}