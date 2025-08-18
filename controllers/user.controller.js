import * as usersRepo from '../repositories/users.repository.js'
import { hashPassword } from '../utils/password.js'

export const createUser  = async (req, res) => {
    try {
      const { username, email, password, roles } = req.body;
      const hashed = await hashPassword(password);
      const savedUser = await usersRepo.createUser({ username, email, password: hashed });
      if (roles && Array.isArray(roles) && roles.length > 0) {
        await usersRepo.assignRolesToUser(savedUser.id, roles);
      }
      return res.status(200).json(savedUser);
    } catch (error) {
      console.error(error);
    }
  };
  
  export const getUsers = async (req, res) => {
    const users = await usersRepo.listUsers();
    res.json(users);
  };
  
  export const getUser = async (req, res) => {
    const user = await usersRepo.findUserById(req.params.userId);
    res.json(user);
  };

  export const updateUser = async (req, res) => {
    const fields = { ...req.body };
    if (fields.password) {
      fields.password = await hashPassword(fields.password);
    }
    const updated = await usersRepo.updateUser(req.params.userId, fields);
    res.json(updated);
  }

  export const deleteUser = async (req, res) => {
    await usersRepo.deleteUser(req.params.userId);
    res.json({ message: 'User deleted' });
  }