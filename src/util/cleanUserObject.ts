import {IApplication, IUser} from "../models/user/fields";

export const cleanUserObject = (user?: IUser):Record<string, any>|undefined => {
    if(user?.["hackerApplication"] !== undefined) {
        user["hackerApplication"] = {} as IApplication;
    }

    return {
        groups: user?.groups,
        roles: user?.roles,
        _id: user?._id,
        email: user?.email,
        created: user?.created,
    }
}