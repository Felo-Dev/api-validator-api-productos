import jwt from 'jsonwebtoken';
import config from '../config.js';
import * as usersRepo from '../repositories/users.repository.js';
import { hashPassword, comparePassword } from '../utils/password.js';

export const signup = async (req, res) => {

    const { username, email, password, roles } = req.body;
    const passwordHash = await hashPassword(password);
    const savedUser = await usersRepo.createUser({ username, email, password: passwordHash });
    if (roles && Array.isArray(roles) && roles.length > 0) {
        await usersRepo.assignRolesToUser(savedUser.id, roles);
    } else {
        await usersRepo.assignRolesToUser(savedUser.id, ['user']);
    }

    const token = jwt.sign({ id: savedUser.id }, config.SECRET, {
        expiresIn: 86400
    })

    res.status(200).json({ token })

}


export const signin = async (req, res) => {

const userFound = await usersRepo.findUserByEmail(req.body.email);
    
    if (!userFound) {
        return res.status(404).json({ message: 'User not found' })
       
    }

    const mathPassword = await comparePassword(req.body.password, userFound.password)

    if (!mathPassword) {
        return res.status(401).json({ token: null, message: 'Password does not match' })
    }

       const token = jwt.sign({ id: userFound.id }, config.SECRET, {
            expiresIn: 86400
        });

        res.json({token})     
}