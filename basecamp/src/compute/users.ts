import axios from "axios"

interface UserInfo {
  hash_id: string
  timestamp: string
}

export type User = [ credential_id: string, userInfo: UserInfo ]
export type UserList = User[]

export const getUsers = async (): Promise<UserList> => {
  const usersReq = await axios.get("/pdos/users")
  const users = usersReq.data
  const usersList = Object.entries(users)
  return usersList as [ credential_id: string, userInfo: UserInfo ][]
} 

export const getUser = async (credentialId: string): Promise<User> => {
  const userReq = await axios.get("/pdos/users/" + credentialId)
  const user = userReq.data
  return user as User 
}