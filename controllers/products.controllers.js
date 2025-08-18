import * as productsRepo from '../repositories/products.repository.js';


export const createProducts = async (req, res) => {
    const { name, category, price, imgURL } = req.body;
    const productSaved = await productsRepo.createProduct({ name, category, price, imgURL });
    res.json(productSaved);
};

export const getProducts = async (req, res) => {
    const products = await productsRepo.listProducts();
    res.json(products);
};

export const getProductById = async (req, res) => {
    const product = await productsRepo.getProductById(req.params.productId);
    res.status(200).json(product);
};

export const updateProduct = async (req, res) => {
    const updated = await productsRepo.updateProduct(req.params.productId, req.body);
    res.status(200).json(updated);
};

export const deleteProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        await productsRepo.deleteProduct(productId);
        res.status(200).json({ message: 'Product deleted' });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({ message: 'Error al eliminar producto' });
    }
};