const Joi = require('joi');

// Esquema para campos que pueden ser un número (valor absoluto o porcentaje) o un string con '%' (porcentaje).
// Ej: 50000, 19, "19%"
const amountOrPercentSchema = Joi.alternatives().try(
    Joi.number().positive().allow(0),
    Joi.string().pattern(/^[0-9]+(?:\.[0-9]+)?%?$/)
);

const invoiceSchema = Joi.object({
    company: Joi.object({
        name: Joi.string().allow(''),
        logo: Joi.string().allow(''),
        logo_small: Joi.string().allow(''),
        tax_id: Joi.string().allow(''),
        phone: Joi.string().allow(''),
        city: Joi.string().allow(''),
        website: Joi.string().allow('')
    }).optional(),

    client: Joi.object({
        name: Joi.string().required(),
        nit: Joi.string().allow('').required(),
        code: Joi.string().allow('').required()
    }).required(),

    invoice: Joi.object({
        type: Joi.string().required(),
        number: Joi.string().required(),
        place: Joi.string().required(),
        date: Joi.string().required(),
        expiry_date: Joi.string().allow(''),
        seller: Joi.string().allow(''),
        conditions: Joi.string().allow(''),
        reference: Joi.string().allow(''),
        delivery: Joi.string().allow(''),
        // Usamos el esquema personalizado para iva y descuento
        iva: amountOrPercentSchema.optional(),
        descuento: amountOrPercentSchema.optional()
    }).required(),

    items: Joi.array().items(Joi.object({
        code: Joi.string().required(),
        name: Joi.string().required(),
        details: Joi.array().items(Joi.string()).optional(),
        quantity: Joi.number().positive().required(),
        unit_price: Joi.number().min(0).required()
    })).min(1).required(),

    observations: Joi.array().items(Joi.string()).optional()
});

// Middleware de validación para Express
const validateInvoice = (req, res, next) => {
    const { error } = invoiceSchema.validate(req.body, { abortEarly: false });
    if (error) {
        const errorDetails = error.details.map(detail => detail.message);
        return res.status(400).json({ error: 'Datos de factura inválidos', details: errorDetails });
    }
    next();
};

module.exports = { validateInvoice };
