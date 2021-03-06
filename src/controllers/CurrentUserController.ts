import { UsersApi } from "../../sdk";
import { CodeToError } from "../errors/Errors";
import User from "../models/User";
import APIConfig from "./APIConfig";

export default class CurrentUserController {
    private static _instance?: CurrentUserController;
    private static _userAPI = new UsersApi(APIConfig);
    private static _onReadyCallbacks: Function[] = [];

    private _currentUser: User;
    private _friends: User[];
    private _friendRequests: User[];

    private constructor(currentUser: User, friends: User[], friendRequests: User[]) {
        this._currentUser = currentUser;
        this._friends = friends;
        this._friendRequests = friendRequests;
    }

    static get Instance() { return CurrentUserController._instance }

    /**
     * Return true if an instance has been created/User has logged in
     */
    static get Initialized() {
        return this._instance instanceof CurrentUserController;
    }

    /**
     * Delete saved instance
     */
    static DestroyInstance() {
        delete this._instance;
    }
    
    get CurrentUser() { return this._currentUser }
    get Friends() { return this._friends }
    get FriendRequests() { return this._friendRequests }

    /**
     * Update current user info and friends info
     * @throws a {@link UnauthorizedError} if user is not logged in
     * @throws a {@link UnknownError} for other errors
     */
    static async Update() {
        try {
            let getCurrentUserRes = await this._userAPI.usersMeGet();
            let getFriendsRes = await this._userAPI.usersFriendsGet();
            let getFriendRequestsRes = await this._userAPI.usersFriendsRequestsGet();

            let currentUser = new User(getCurrentUserRes.Username);
            let listFriends = getFriendsRes.map(u => new User(u.Username));
            let listFriendRequests = getFriendRequestsRes.map(u => new User(u.Username));

            if (this._instance instanceof CurrentUserController) {
                this._instance._currentUser = currentUser;
                this._instance._friends = listFriends;
                this._instance._friendRequests = listFriendRequests;
            }
            else {
                this._instance = new CurrentUserController(currentUser, listFriends, listFriendRequests);
            }

            this._onReadyCallbacks.forEach(callback => callback());
        }
        catch (e) {
            let response = e as Response;

            console.error('Code %d: Error updating current user.', response.status);

            throw CodeToError(response.status);
        }
    }

    /**
     * Add a callback function from a React Component to a pool, it will be called after current user's info is updated.
     * @param owner an instance of a {@link React.Component}
     * @param callback a function to call when instance is ready
     */
    static AddOnReadyListener(callback: Function) {
        this._onReadyCallbacks.push(callback);
    }
}