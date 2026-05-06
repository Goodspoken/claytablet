package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

type Client struct {
	BaseURL  string
	Room     string
	Password string
	Token    string
	http     *http.Client
}

func New(baseURL, room, password, token string) *Client {
	return &Client{
		BaseURL:  strings.TrimRight(baseURL, "/"),
		Room:     room,
		Password: password,
		Token:    token,
		http:     &http.Client{Timeout: 15 * time.Second},
	}
}

// Item represents any board item returned by the API
type Item struct {
	ID        string `json:"id"`
	Type      string `json:"type"`
	Content   string `json:"content,omitempty"`
	URL       string `json:"url,omitempty"`
	Filename  string `json:"filename,omitempty"`
	Author    string `json:"author,omitempty"`
	Text      string `json:"text,omitempty"`
	CreatedAt string `json:"created_at,omitempty"`
}

type RoomData struct {
	Texts  []Item `json:"texts"`
	Images []Item `json:"images"`
	Audios []Item `json:"audios"`
	Files  []Item `json:"files"`
	Chats  []Item `json:"chats"`
}

func (c *Client) newRequest(method, path string, body any) (*http.Request, error) {
	var bodyReader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewReader(b)
	}

	req, err := http.NewRequest(method, c.BaseURL+path, bodyReader)
	if err != nil {
		return nil, err
	}

	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if c.Password != "" {
		req.Header.Set("X-Room-Password", c.Password)
	}
	if c.Token != "" {
		req.Header.Set("Authorization", "Bearer "+c.Token)
	}

	return req, nil
}

func (c *Client) do(req *http.Request, out any) error {
	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 401 {
		return fmt.Errorf("комната защищена паролем (используй --password)")
	}
	if resp.StatusCode == 403 {
		return fmt.Errorf("личная комната — нужна авторизация (используй --token)")
	}
	if resp.StatusCode >= 400 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API ошибка %d: %s", resp.StatusCode, string(b))
	}

	if out != nil {
		return json.NewDecoder(resp.Body).Decode(out)
	}
	return nil
}

// GetRoom возвращает все элементы комнаты
func (c *Client) GetRoom() (*RoomData, error) {
	req, err := c.newRequest("GET", "/api/claytablet/"+c.Room, nil)
	if err != nil {
		return nil, err
	}
	var data RoomData
	return &data, c.do(req, &data)
}

// SendText отправляет текст в комнату
func (c *Client) SendText(content string) (*Item, error) {
	req, err := c.newRequest("POST", "/api/claytablet/"+c.Room+"/text",
		map[string]string{"content": content})
	if err != nil {
		return nil, err
	}
	var item Item
	return &item, c.do(req, &item)
}

// DeleteItem удаляет элемент по ID
func (c *Client) DeleteItem(itemID string) error {
	req, err := c.newRequest("DELETE", "/api/claytablet/"+c.Room+"/"+itemID, nil)
	if err != nil {
		return err
	}
	return c.do(req, nil)
}

// ClearRoom удаляет все элементы комнаты
func (c *Client) ClearRoom() error {
	req, err := c.newRequest("DELETE", "/api/claytablet/"+c.Room+"/all", nil)
	if err != nil {
		return err
	}
	return c.do(req, nil)
}

// Watch подключается по WebSocket и вызывает callback при каждом обновлении
func (c *Client) Watch(onUpdate func()) error {
	u, err := url.Parse(c.BaseURL)
	if err != nil {
		return err
	}

	scheme := "ws"
	if u.Scheme == "https" {
		scheme = "wss"
	}

	wsURL := fmt.Sprintf("%s://%s/api/ws/rooms/%s", scheme, u.Host, c.Room)
	if c.Token != "" {
		wsURL += "?token=" + c.Token
	}

	headers := http.Header{}
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, headers)
	if err != nil {
		return fmt.Errorf("WebSocket ошибка: %w", err)
	}
	defer conn.Close()

	// Ping/pong keepalive
	conn.SetPingHandler(func(data string) error {
		return conn.WriteMessage(websocket.PongMessage, []byte(data))
	})

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			return fmt.Errorf("соединение разорвано: %w", err)
		}
		if string(msg) == "sync" {
			onUpdate()
		}
	}
}
