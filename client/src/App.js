import { useEffect, useState } from 'react';
import socket from './socket';
import toast, { Toaster } from 'react-hot-toast';
import ScrollToBottom from 'react-scroll-to-bottom';
import './App.css'

function App() {

  const [username, setUsername] = useState("");
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState({
    type: "",
    data_rec: ""
  })
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [textEnable, setTextEnable] = useState(true);
  const [textEnablePrivate, setTextEnablePrivate] = useState(true);
  const [privateMessage, setPrivateMessage] = useState({
    type: "",
    data_recc: ""
  })

  useEffect(() => {
    socket.on("user joined", (msg) => {
      console.log("user joined message", msg);
    })

    socket.on("message", (data) => {
      console.log("message", message);

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          id: data.id,
          name: data.name,
          message: data.m.data_rec,
          type: data.m.type
        }
      ])
    })

    return () => {
      socket.off("user joined");
      socket.off("message");
    }
  }, [])

  useEffect(() => {
    socket.on("user connected", (user) => {
      user.connected = true;
      user.messages = [];
      user.hasNewMessages = false;
      setUsers((prevUsers) => [...prevUsers, user]);
      toast.success(`${user.username} joined`);
    })

    socket.on("users", (users) => {
      users.forEach((user) => {
        user.self = user.userID === socket.id;
        user.connected = true;
        user.messages = [];
        user.hasNewMessages = false;
      })

      const sorted = users.sort((a, b) => {
        if (a.self) return -1;
        if (b.self) return 1;
        if (a.username < b.username) return -1;
        return a.username > b.username ? 1 : 0;
      })

      setUsers(sorted);
    })

    socket.on("username taken", () => {
      toast.error("username taken");
    })

    return () => {
      socket.off("users");
      socket.off("user connected");
      socket.off("username taken");
    }
  }, [socket])

  useEffect(() => {
    socket.on("user disconnected", (id) => {
      let allUsers = users;

      let index = allUsers.findIndex((el) => el.userID === id);
      let foundUser = allUsers[index];
      foundUser.connected = false;

      allUsers[index] = foundUser;
      setUsers([...allUsers]);
      toast.error(`${foundUser.username} left`);
    })

    return () => {
      socket.off("user disconnected");
    }
  }, [users, socket])

  useEffect(() => {
    socket.on("typing", (data) => {
      setTyping(data);
      setTimeout(() => {
        setTyping("");
      }, 1000);
    })

    return () => {
      socket.off("typing");
    }
  }, [])

  // Private message
  useEffect(() => {
    socket.on("private message", ({ mm, from }) => {
      console.log("message > ", message, "from > ", from);
      const allUsers = users;
      let index = allUsers.findIndex((u) => u.userID === from);
      let foundUser = allUsers[index];
      console.log(foundUser);
      foundUser.messages.push({
        type: mm.type,
        message: mm.data_rec_private,
        fromSelf: false
      })

      if (foundUser) {
        if (selectedUser) {
          if (foundUser.userID !== selectedUser.userID) {
            foundUser.hasNewMessages = true;
          }
        } else {
          foundUser.hasNewMessages = true;
        }

        allUsers[index] = foundUser;
        setUsers([...allUsers]);
      }
    })

    return () => {
      socket.off("private message");
    }
  }, [users])

  const handleUsername = (e) => {
    e.preventDefault();
    socket.auth = { username };
    socket.connect();
    setConnected(true);
    console.log(socket.auth);
    console.log("socket connected", socket);
  }

  const handleMessage = (e) => {
    let t;
    if (textEnable === true) t = "text";
    else t = "im";

    console.log(t,message);
    e.preventDefault();
    socket.emit("message", {
      id: Date.now(),
      name: username,
      m: { type: t, data_rec: message.data_rec }
    })
    console.log(messages);
    setMessage({ type: "", data_rec: "" });
  }

  if (message.data_rec) {
    socket.emit("typing", username);
  }

  const handleUsernameClick = (user) => {
    if (user.self || !user.connected) return;
    setSelectedUser({ ...user, hasNewMessages: false });

    let allUsers = users;
    let index = allUsers.findIndex((u) => u.userID === user.userID);
    let foundUser = allUsers[index];
    foundUser.hasNewMessages = false;

    allUsers[index] = foundUser;
    setUsers([...allUsers]);
  }

  const uploadImage = async (e) => {
    const file = e.target.files[0];
    const base64 = await convertBase64(file);
    setMessage({ ...message, data_rec: base64.toString() });
  }

  const uploadImage2 = async (e) => {
    const file = e.target.files[0];
    const base64 = await convertBase64(file);
    setPrivateMessage({ ...privateMessage, data_recc: base64.toString() });
  }

  const convertBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);
      fileReader.onload = () => {
        resolve(fileReader.result);
      }
      fileReader.onerror = (err) => {
        reject(err);
      }
    })
  }

  const handlePrivateMessage = (e) => {
    let tt;
    if (textEnablePrivate === true) tt = "text";
    else tt = "im";

    e.preventDefault();
    if (selectedUser) {
      socket.emit("private message", {
        mm: { type: tt, data_rec_private: privateMessage.data_recc },
        to: selectedUser.userID
      })

      let updated = selectedUser;
      updated.messages.push({
        type: tt,
        message: privateMessage.data_recc,
        fromSelf: true,
        hasNewMessages: false
      })

      console.log(updated);
      setSelectedUser(updated);
      setPrivateMessage({ type: "", data_recc: "" });
    }
  }

  return (
    <div className='container-fluid'>
      <Toaster />
      <div className="row bg-primary text-center">
        <h1 className="fw-bold pt-2 text-light">WEB-CHAT</h1>
        <br />
      </div>

      {!connected && (
        <div className="row">
          <form onSubmit={handleUsername} className="text-center pt-3">
            <div className="row g-3">
              <div className="col-md-8">
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  type="text"
                  placeholder='Enter your name'
                  className='form-control'
                />
              </div>

              <div className="col-md-4">
                <button className="btn btn-secondary" type='submit'>
                  Join
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="row">
        <div className="col-md-2 pt-3">
          {connected &&
            users.map((user) => (
              <div
                key={user.userID}
                onClick={() => handleUsernameClick(user)}
                style={{
                  textDecoration:
                    selectedUser?.userID === user.userID && "underline",
                  cursor: !user.self && "pointer"
                }}
              >
                {user.username}{" "}
                {user.self && "(yourself)"}{" "}
                {user.connected ? (
                  <span className='online-dot'></span>
                ) : (
                  <span className='offline-dot'></span>
                )}
                {user.hasNewMessages && <b className='text-danger'>_ _ _</b>}
                {user.hasNewMessages && (
                  <b className="text-danger">
                    {user.hasNewMessages && user.messages.length}
                  </b>
                )}
              </div>
            ))
          }
        </div>

        {connected && (
          <div className="col-md-5">
            <div className="form-check">
              <input
                type="radio"
                name='exampleRadios'
                id='exampleRadios1'
                value="option1"
                checked={!textEnable}
                className="form-check-input"
                onChange={(e) => {
                  setTextEnable(!e.target.checked);
                  setMessage({ text: "", data_rec: "" });
                }}
              />
              <label htmlFor="exampleRadios1" className="form-check-label">
                Image
              </label>
            </div>
            <div className="form-check">
              <input
                className='form-check-input'
                type="radio"
                name='exampleRadios'
                id='exampleRadios2'
                value="option2"
                checked={textEnable}
                onChange={(e) => {
                  setTextEnable(e.target.checked);
                  setMessage({ type: "", data_rec: "" })
                }}
              />
              <label htmlFor="exampleRadios2" className="form-check-label">
                Text
              </label>
            </div>

            <form onSubmit={handleMessage} className="text-center pt-3">
              <div className="row g-3">
                <div className="col-10">
                  <input
                    value={message.data_rec}
                    onChange={(e) => {
                      setMessage({ ...message, data_rec: e.target.value })
                    }}
                    placeholder='Type your message (public)'
                    type={textEnable === false ? "hidden" : ""}
                    className="form-control"
                  />

                  {!textEnable && (
                    <input
                      type="file"
                      className="form-control"
                      id='formFile'
                      onChange={(e) => {
                        uploadImage(e);
                      }}
                    />
                  )}
                </div>

                <div className="col-2">
                  <button className="btn btn-secondary" type='submit'>
                    Send
                  </button>
                </div>
              </div>
            </form>

            <br />

            <div className="col">
              {typing && typing}
              <ScrollToBottom>
                {messages.map((m) => (
                  <div className="alert alert-secondary" key={m.id}>
                    {m.name} - {" "}
                    {m.type === "im" && <img src={m.message} alt='a' />}
                    {m.type === "text" && m.message}
                  </div>
                ))}
              </ScrollToBottom>
              <br />
            </div>
          </div>
        )}

        <br />

        {selectedUser && (
          <div className="col-md-5">
            <div className="form-check">
              <input
                type="radio"
                className="form-check-input"
                name='exampleRadios1'
                id='exampleRadios11'
                value="option11"
                checked={!textEnablePrivate}
                onChange={(e) => {
                  setTextEnablePrivate(!e.target.checked);
                  setPrivateMessage({ type: "", data_recc: "" });
                }}
              />
              <label htmlFor="exampleRadios11" className="form-check-label">
                Image
              </label>
            </div>
            <div className="form-check">
              <input
                type="radio"
                className='form-check-input'
                name='exampleRadios2'
                id='exampleRadios22'
                value='option22'
                checked={textEnablePrivate}
                onChange={(e) => {
                  setTextEnablePrivate(e.target.checked);
                  setPrivateMessage({ type: "", data_recc: "" });
                }}
              />
              <label htmlFor="exampleRadios22" className="form-check-label">
                Text
              </label>
            </div>

            <form onSubmit={handlePrivateMessage} className="text-center pt-3">
              <div className="row g-3">
                <div className="col-10">
                  <input
                    type={textEnablePrivate === false ? "hidden" : ""}
                    className="form-control"
                    value={privateMessage.data_recc}
                    onChange={(e) => {
                      setPrivateMessage({ ...privateMessage, data_recc: e.target.value })
                    }}
                    placeholder='Type your message (private)'
                  />
                </div>

                {!textEnablePrivate && (
                  <input
                    type="file"
                    className="form-control"
                    id='formFile2'
                    onChange={(e) => {
                      uploadImage2(e);
                    }}
                  />
                )}

                <div className="col-2">
                  <button className="btn btn-secondary" type='submit'>
                    Send
                  </button>
                </div>
              </div>
            </form>

            <br />

            <div className="col">
              <ScrollToBottom>
                {selectedUser && selectedUser.messages && selectedUser.messages.map((msg, index) => (
                  <div key={index} className="alert alert-secondary">
                    {msg.fromSelf ? "(yourself)" : selectedUser.username}{" "}
                    {" - "}
                    {msg.type === "im" && <img src={msg.message} alt='img' />}
                    {msg.type === "text" && msg.message}
                  </div>
                ))}
              </ScrollToBottom>
              <br />
              {typing && typing}
            </div>
          </div>
        )}
        <br />
      </div>
    </div>
  );
}

export default App;
