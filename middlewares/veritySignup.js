import * as usersRepo from "../repositories/users.repository.js";

const checkDuplicateUsernameOrEmail = async (req, res, next) => {
    try {
      const users = await usersRepo.listUsers();
      const byUsername = users.find(u => u.username === req.body.username);
      if (byUsername)
        return res.status(400).json({ message: "The user already exists" });
      const byEmail = await usersRepo.findUserByEmail(req.body.email);
      if (byEmail)
        return res.status(400).json({ message: "The email already exists" });
      next();
    } catch (error) {
      res.status(500).json({ message: error });
    }
  };
  
  const checkRolesExisted = async (req, res, next) => {
    if (req.body.roles && Array.isArray(req.body.roles)) {
      const roles = req.body.roles;
      const allowed = ["user", "moderator", "admin"];
      for (let i = 0; i < roles.length; i++) {
        if (!allowed.includes(roles[i])) {
          return res.status(400).json({
            message: `Role ${roles[i]} does not exist`,
          });
        }
      }
    }
    next();
  };
  
  export { checkDuplicateUsernameOrEmail, checkRolesExisted };