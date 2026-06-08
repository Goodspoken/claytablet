package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
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

// PluginInfo describes an installed plugin
type PluginInfo struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Version     string `json:"version"`
	Author      string `json:"author"`
	Description string `json:"description"`
	Status      string `json:"status"`
}

func (c *Client) newRequest(ctx context.Context, method, path string, body any) (*http.Request, error) {
	var bodyReader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewReader(b)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.BaseURL+path, bodyReader)
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
func (c *Client) GetRoom(ctx context.Context) (*RoomData, error) {
	req, err := c.newRequest(ctx, "GET", "/api/claytablet/"+c.Room, nil)
	if err != nil {
		return nil, err
	}
	var data RoomData
	return &data, c.do(req, &data)
}

// SendText отправляет текст в комнату
func (c *Client) SendText(ctx context.Context, content string) (*Item, error) {
	req, err := c.newRequest(ctx, "POST", "/api/claytablet/"+c.Room+"/text",
		map[string]string{"content": content})
	if err != nil {
		return nil, err
	}
	var item Item
	return &item, c.do(req, &item)
}

// UploadFile загружает файл на сервер
func (c *Client) UploadFile(ctx context.Context, filePath string) (*Item, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("ошибка открытия файла: %w", err)
	}
	defer file.Close()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", filepath.Base(filePath))
	if err != nil {
		return nil, err
	}
	if _, err := io.Copy(part, file); err != nil {
		return nil, err
	}
	if err := writer.Close(); err != nil {
		return nil, err
	}

	ext := strings.ToLower(filepath.Ext(filePath))
	endpointType := "file"
	switch ext {
	case ".png", ".jpg", ".jpeg", ".gif", ".webp":
		endpointType = "image"
	case ".mp3", ".wav", ".ogg", ".webm":
		endpointType = "audio"
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.BaseURL+"/api/claytablet/"+c.Room+"/"+endpointType, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())
	if c.Password != "" {
		req.Header.Set("X-Room-Password", c.Password)
	}
	if c.Token != "" {
		req.Header.Set("Authorization", "Bearer "+c.Token)
	}

	var item Item
	return &item, c.do(req, &item)
}

// DownloadFile скачивает файл с сервера
func (c *Client) DownloadFile(ctx context.Context, itemURL, destPath string) error {
	req, err := c.newRequest(ctx, "GET", itemURL, nil)
	if err != nil {
		return err
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("ошибка запроса: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("ошибка сервера: %s", resp.Status)
	}

	out, err := os.Create(destPath)
	if err != nil {
		return fmt.Errorf("ошибка создания файла: %w", err)
	}
	defer out.Close()

	_, err = io.Copy(out, resp.Body)
	return err
}

// DeleteItem удаляет элемент по ID
func (c *Client) DeleteItem(ctx context.Context, itemID string) error {
	req, err := c.newRequest(ctx, "DELETE", "/api/claytablet/"+c.Room+"/"+itemID, nil)
	if err != nil {
		return err
	}
	return c.do(req, nil)
}

// ClearRoom удаляет все элементы комнаты
func (c *Client) ClearRoom(ctx context.Context) error {
	req, err := c.newRequest(ctx, "DELETE", "/api/claytablet/"+c.Room+"/all", nil)
	if err != nil {
		return err
	}
	return c.do(req, nil)
}

// --- Plugin API ---

// ListPlugins возвращает список установленных плагинов
func (c *Client) ListPlugins(ctx context.Context) ([]PluginInfo, error) {
	req, err := c.newRequest(ctx, "GET", "/api/plugins", nil)
	if err != nil {
		return nil, err
	}
	var plugins []PluginInfo
	return plugins, c.do(req, &plugins)
}

// GetPluginConfig возвращает конфиг плагина как raw JSON
func (c *Client) GetPluginConfig(ctx context.Context, pluginID string) (json.RawMessage, error) {
	req, err := c.newRequest(ctx, "GET", "/api/plugins/"+pluginID+"/config", nil)
	if err != nil {
		return nil, err
	}
	var raw json.RawMessage
	return raw, c.do(req, &raw)
}

// SetPluginConfig сохраняет конфиг плагина из raw JSON
func (c *Client) SetPluginConfig(ctx context.Context, pluginID string, raw json.RawMessage) error {
	var body any
	if err := json.Unmarshal(raw, &body); err != nil {
		return fmt.Errorf("невалидный JSON: %w", err)
	}
	req, err := c.newRequest(ctx, "POST", "/api/plugins/"+pluginID+"/config", body)
	if err != nil {
		return err
	}
	return c.do(req, nil)
}

// CallPlugin вызывает произвольный HTTP-эндпоинт плагина
func (c *Client) CallPlugin(ctx context.Context, pluginID, path, method string, body json.RawMessage) (json.RawMessage, error) {
	fullPath := "/api/plugins/" + pluginID + "/" + strings.TrimLeft(path, "/")
	var reqBody any
	if len(body) > 0 {
		if err := json.Unmarshal(body, &reqBody); err != nil {
			return nil, fmt.Errorf("невалидный JSON body: %w", err)
		}
	}
	req, err := c.newRequest(ctx, strings.ToUpper(method), fullPath, reqBody)
	if err != nil {
		return nil, err
	}
	var result json.RawMessage
	return result, c.do(req, &result)
}

// Watch подключается по WebSocket и вызывает callback при каждом обновлении
func (c *Client) Watch(ctx context.Context, onUpdate func()) error {
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
	conn, _, err := websocket.DefaultDialer.DialContext(ctx, wsURL, headers)
	if err != nil {
		return fmt.Errorf("WebSocket ошибка: %w", err)
	}
	defer conn.Close()

	// Горутина для закрытия вебсокета при отмене контекста
	go func() {
		<-ctx.Done()
		conn.Close()
	}()

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
