import { IUser } from "../../../models/user/fields";

export default (u: IUser, filterQuery: any) => {
    // We use filter queries to narrow down the list of emails even further.
    // In some cases (such as with virtual fields), we cannot rely on mongodb to filter for us.
    for (const field in filterQuery) {
      const query = field.split('.');

      if (query.length > 0) {
        let runner: any = u;

        for (let i = 0; i < query.length; i++) {
          if (runner !== undefined) {
            runner = runner[query[i]];
          } else {
            return false;
          }
        }

        if (runner !== filterQuery[field]) {
          return false;
        }
      }
    }

    return true;
  }