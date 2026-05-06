package cmd

import (
	"fmt"
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/textinput"
	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/spf13/cobra"
)

var tuiCmd = &cobra.Command{
	Use:   "tui",
	Short: "Открыть интерактивную доску в терминале",
	RunE: func(cmd *cobra.Command, args []string) error {
		m := initialModel()
		p := tea.NewProgram(m, tea.WithAltScreen())
		_, err := p.Run()
		return err
	},
}

func init() {
	rootCmd.AddCommand(tuiCmd)
}

// --- Styles ---

var (
	styleHeader = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("39"))
	styleCursor = lipgloss.NewStyle().Foreground(lipgloss.Color("205")).Bold(true)

	styleKindText = lipgloss.NewStyle().Foreground(lipgloss.Color("82")).Bold(true)
	styleKindImg  = lipgloss.NewStyle().Foreground(lipgloss.Color("39")).Bold(true)
	styleKindAud  = lipgloss.NewStyle().Foreground(lipgloss.Color("220")).Bold(true)
	styleKindFile = lipgloss.NewStyle().Foreground(lipgloss.Color("141")).Bold(true)

	styleDim       = lipgloss.NewStyle().Foreground(lipgloss.Color("240"))
	styleStatusOk  = lipgloss.NewStyle().Foreground(lipgloss.Color("82"))
	styleStatusErr = lipgloss.NewStyle().Foreground(lipgloss.Color("196"))
	styleStatusWarn = lipgloss.NewStyle().Foreground(lipgloss.Color("220"))

	styleInputPrompt = lipgloss.NewStyle().Foreground(lipgloss.Color("205")).Bold(true)
	styleBox         = lipgloss.NewStyle().
				Border(lipgloss.RoundedBorder()).
				BorderForeground(lipgloss.Color("238")).
				Padding(0, 1)
	styleDetailHeader = lipgloss.NewStyle().
				Bold(true).
				Foreground(lipgloss.Color("205")).
				BorderBottom(true).
				BorderStyle(lipgloss.NormalBorder()).
				BorderForeground(lipgloss.Color("238"))
)

// --- Types ---

type itemEntry struct {
	id        string
	kind      string
	content   string
	createdAt string
}

type tuiMode int

const (
	modeNormal tuiMode = iota
	modeInput
	modeDetail
)

type model struct {
	items     []itemEntry
	cursor    int
	loading   bool
	statusMsg string
	statusOk  bool
	statusWarn bool
	width     int
	height    int
	viewport  viewport.Model
	ready     bool
	mode      tuiMode
	input     textinput.Model
	detail    *itemEntry
}

type dataMsg []itemEntry
type errMsg struct{ err error }
type statusClearMsg struct{}
type wsUpdateMsg struct{}
type wsSendOkMsg struct{}

func initialModel() model {
	ti := textinput.New()
	ti.Placeholder = "Введите текст и нажмите Enter..."
	ti.CharLimit = 2000
	return model{loading: true, input: ti}
}

// --- Commands ---

func fetchRoomData() tea.Msg {
	data, err := client.GetRoom()
	if err != nil {
		return errMsg{err}
	}
	var all []itemEntry
	for _, t := range data.Texts {
		all = append(all, itemEntry{t.ID, "TEXT", t.Content, t.CreatedAt})
	}
	for _, img := range data.Images {
		name := img.Filename
		if name == "" {
			name = img.URL
		}
		all = append(all, itemEntry{img.ID, "IMG ", name, img.CreatedAt})
	}
	for _, a := range data.Audios {
		all = append(all, itemEntry{a.ID, "AUD ", a.URL, a.CreatedAt})
	}
	for _, f := range data.Files {
		all = append(all, itemEntry{f.ID, "FILE", f.Filename, f.CreatedAt})
	}
	return dataMsg(all)
}

var wsSub chan tea.Msg

func listenWebSocket(sub chan<- tea.Msg, done <-chan struct{}) {
	for {
		select {
		case <-done:
			return
		default:
		}
		err := client.Watch(func() {
			select {
			case sub <- wsUpdateMsg{}:
			case <-done:
			}
		})
		if err != nil {
			select {
			case sub <- errMsg{err}:
			case <-done:
				return
			}
			time.Sleep(3 * time.Second)
		}
	}
}

var wsDone chan struct{}

func waitForWSUpdate(sub <-chan tea.Msg) tea.Cmd {
	return func() tea.Msg { return <-sub }
}

func sendText(text string) tea.Msg {
	_, err := client.SendText(text)
	if err != nil {
		return errMsg{err}
	}
	return wsSendOkMsg{}
}

// --- TEA Interface ---

func (m model) Init() tea.Cmd {
	wsSub = make(chan tea.Msg, 8)
	wsDone = make(chan struct{})
	go listenWebSocket(wsSub, wsDone)
	return tea.Batch(
		func() tea.Msg { return fetchRoomData() },
		waitForWSUpdate(wsSub),
	)
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmds []tea.Cmd

	switch msg := msg.(type) {

	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		contentH := m.height - 5
		if contentH < 1 {
			contentH = 1
		}
		if !m.ready {
			m.viewport = viewport.New(m.width-4, contentH)
			m.ready = true
		} else {
			m.viewport.Width = m.width - 4
			m.viewport.Height = contentH
		}
		m.updateViewport()

	case dataMsg:
		// Обновляем detail если он открыт
		if m.detail != nil {
			for _, item := range msg {
				if item.id == m.detail.id {
					copy := item
					m.detail = &copy
					m.updateDetailViewport()
					break
				}
			}
		}
		m.items = msg
		m.loading = false
		if m.cursor >= len(m.items) && len(m.items) > 0 {
			m.cursor = len(m.items) - 1
		}
		if m.mode != modeDetail {
			m.updateViewport()
		}

	case wsUpdateMsg:
		cmds = append(cmds,
			func() tea.Msg { return fetchRoomData() },
			waitForWSUpdate(wsSub),
		)

	case wsSendOkMsg:
		m.statusMsg = "✓ Отправлено"
		m.statusOk = true
		m.statusWarn = false
		cmds = append(cmds, clearStatusAfter(2*time.Second))
		cmds = append(cmds, func() tea.Msg { return fetchRoomData() })

	case errMsg:
		m.statusMsg = "✗ " + msg.err.Error()
		m.statusOk = false
		m.statusWarn = false
		cmds = append(cmds, clearStatusAfter(4*time.Second))

	case statusClearMsg:
		m.statusMsg = ""

	case tea.KeyMsg:
		switch m.mode {
		case modeDetail:
			cmds = append(cmds, m.handleDetailKey(msg)...)
		case modeInput:
			cmds = append(cmds, m.handleInputKey(msg)...)
		default:
			cmds = append(cmds, m.handleNormalKey(msg)...)
		}
	}

	if m.mode == modeInput {
		var inputCmd tea.Cmd
		m.input, inputCmd = m.input.Update(msg)
		cmds = append(cmds, inputCmd)
	}

	if m.mode == modeDetail {
		var vpCmd tea.Cmd
		m.viewport, vpCmd = m.viewport.Update(msg)
		cmds = append(cmds, vpCmd)
	}

	return m, tea.Batch(cmds...)
}

func (m *model) handleNormalKey(msg tea.KeyMsg) []tea.Cmd {
	switch msg.String() {
	case "ctrl+c", "q":
		close(wsDone)
		return []tea.Cmd{tea.Quit}

	case "up", "k":
		if m.cursor > 0 {
			m.cursor--
			m.updateViewport()
		}

	case "down", "j":
		if m.cursor < len(m.items)-1 {
			m.cursor++
			m.updateViewport()
		}

	case "enter":
		if len(m.items) > 0 && m.cursor < len(m.items) {
			item := m.items[m.cursor]
			m.detail = &item
			m.mode = modeDetail
			m.updateDetailViewport()
		}

	case "y", "c":
		if len(m.items) > 0 && m.cursor < len(m.items) {
			item := m.items[m.cursor]
			if strings.TrimSpace(item.kind) == "TEXT" {
				if err := CopyToClipboard(item.content); err != nil {
					m.statusMsg = "✗ " + err.Error()
					m.statusOk = false
				} else {
					m.statusMsg = "✓ Скопировано"
					m.statusOk = true
				}
			} else {
				m.statusMsg = "Копировать можно только TEXT"
				m.statusOk = false
				m.statusWarn = true
			}
			return []tea.Cmd{clearStatusAfter(2 * time.Second)}
		}

	case "d", "delete":
		if len(m.items) > 0 && m.cursor < len(m.items) {
			id := m.items[m.cursor].id
			m.statusMsg = "Удаление..."
			m.statusOk = false
			m.statusWarn = true
			return []tea.Cmd{func() tea.Msg {
				if err := client.DeleteItem(id); err != nil {
					return errMsg{err}
				}
				return fetchRoomData()
			}}
		}

	case "n", "s":
		m.mode = modeInput
		m.input.SetValue("")
		m.input.Focus()
		return []tea.Cmd{textinput.Blink}
	}
	return nil
}

func (m *model) handleDetailKey(msg tea.KeyMsg) []tea.Cmd {
	switch msg.String() {
	case "esc", "q", "enter", "backspace":
		m.mode = modeNormal
		m.detail = nil
		m.updateViewport()

	case "y", "c":
		if m.detail != nil && strings.TrimSpace(m.detail.kind) == "TEXT" {
			if err := CopyToClipboard(m.detail.content); err != nil {
				m.statusMsg = "✗ " + err.Error()
				m.statusOk = false
			} else {
				m.statusMsg = "✓ Скопировано"
				m.statusOk = true
			}
			return []tea.Cmd{clearStatusAfter(2 * time.Second)}
		}
	}
	return nil
}

func (m *model) handleInputKey(msg tea.KeyMsg) []tea.Cmd {
	switch msg.String() {
	case "ctrl+c", "esc":
		m.mode = modeNormal
		m.input.Blur()

	case "enter":
		text := strings.TrimSpace(m.input.Value())
		if text != "" {
			m.mode = modeNormal
			m.input.Blur()
			m.statusMsg = "Отправка..."
			m.statusWarn = true
			return []tea.Cmd{func() tea.Msg { return sendText(text) }}
		}
	}
	return nil
}

func (m *model) updateViewport() {
	if !m.ready {
		return
	}
	var sb strings.Builder
	for i, item := range m.items {
		ts := ""
		if len(item.createdAt) >= 16 {
			ts = item.createdAt[11:16]
		}

		preview := strings.ReplaceAll(item.content, "\n", "↵ ")
		maxW := m.viewport.Width - 22
		if maxW < 10 {
			maxW = 10
		}
		runes := []rune(preview)
		if len(runes) > maxW {
			preview = string(runes[:maxW-3]) + "..."
		}

		kindStyled := renderKind(item.kind)
		idShort := item.id
		if len(idShort) > 8 {
			idShort = idShort[:8]
		}

		if i == m.cursor {
			line := styleCursor.Render("> ") + kindStyled + " " +
				styleDim.Render(idShort) + " " + styleDim.Render(ts) + "  " +
				styleCursor.Render(preview)
			sb.WriteString(line + "\n")
		} else {
			line := "  " + kindStyled + " " + styleDim.Render(idShort) + " " +
				styleDim.Render(ts) + "  " + preview
			sb.WriteString(line + "\n")
		}
	}
	m.viewport.SetContent(sb.String())

	if m.cursor < m.viewport.YOffset {
		m.viewport.YOffset = m.cursor
	} else if m.cursor >= m.viewport.YOffset+m.viewport.Height {
		m.viewport.YOffset = m.cursor - m.viewport.Height + 1
	}
}

func (m *model) updateDetailViewport() {
	if !m.ready || m.detail == nil {
		return
	}
	m.viewport.SetContent(m.detail.content)
	m.viewport.GotoTop()
}

func renderKind(kind string) string {
	switch strings.TrimSpace(kind) {
	case "TEXT":
		return styleKindText.Render("TEXT")
	case "IMG":
		return styleKindImg.Render("IMG ")
	case "AUD":
		return styleKindAud.Render("AUD ")
	case "FILE":
		return styleKindFile.Render("FILE")
	default:
		return kind
	}
}

// --- View ---

func (m model) View() string {
	wsIndicator := styleStatusOk.Render("●")
	header := styleHeader.Render("ClayTablet TUI") + "  " + wsIndicator +
		styleDim.Render(fmt.Sprintf("  %s  (%d записей)", client.Room, len(m.items)))

	var body string

	switch m.mode {
	case modeDetail:
		if m.detail != nil {
			idShort := m.detail.id
			if len(idShort) > 8 {
				idShort = idShort[:8]
			}
			detailTitle := styleDetailHeader.Render(
				renderKind(m.detail.kind) + "  " + styleDim.Render(idShort),
			)
			body = detailTitle + "\n" + m.viewport.View()
		}

	default:
		if m.loading {
			body = styleDim.Render("  Загрузка...")
		} else if len(m.items) == 0 {
			body = styleDim.Render("  Комната пуста. Нажми n чтобы добавить запись.")
		} else {
			body = m.viewport.View()
		}
	}

	boxed := styleBox.Width(m.width - 2).Render(body)

	var footer string
	switch m.mode {
	case modeInput:
		footer = styleInputPrompt.Render("Новая запись: ") + m.input.View()
	case modeDetail:
		footer = styleDim.Render("↑/↓: прокрутка  y/c: копировать  esc/enter: назад")
	default:
		if m.statusMsg != "" {
			if m.statusOk {
				footer = styleStatusOk.Render(m.statusMsg)
			} else if m.statusWarn {
				footer = styleStatusWarn.Render(m.statusMsg)
			} else {
				footer = styleStatusErr.Render(m.statusMsg)
			}
		} else {
			footer = styleDim.Render("↑/k ↓/j: навигация  enter: просмотр  y: копировать  d: удалить  n: новая  q: выход")
		}
	}

	return fmt.Sprintf("%s\n%s\n%s", header, boxed, footer)
}

func clearStatusAfter(d time.Duration) tea.Cmd {
	return func() tea.Msg {
		time.Sleep(d)
		return statusClearMsg{}
	}
}
