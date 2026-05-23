import { Router } from "express";
import * as usersCtrl from "../controllers/user.controller.js";
import { authJwt, verifySignup } from "../middlewares/index.js";
import { validate, userSchema, updateUserSchema } from '../utils/validators.js';

const router = Router();

router.post("/", [authJwt.verifyToken, authJwt.isAdmin, validate(userSchema), verifySignup.checkDuplicateUsernameOrEmail, verifySignup.checkRolesExisted], usersCtrl.createUser);

router.get("/", [authJwt.verifyToken, authJwt.isAdmin], usersCtrl.getUsers);

router.get("/:userId", [authJwt.verifyToken], usersCtrl.getUser);

router.put("/:userId", [authJwt.verifyToken, authJwt.isAdmin, validate(updateUserSchema)], usersCtrl.updateUser);

router.delete("/:userId", [authJwt.verifyToken, authJwt.isAdmin], usersCtrl.deleteUser);

export default router;
