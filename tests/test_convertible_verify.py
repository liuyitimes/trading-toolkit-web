from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # 捕获 console 日志
    console_errors = []
    page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)

    # 访问可转债页面
    page.goto('http://localhost:5173/convertible')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)

    # 切换到配售 Tab
    placement_tab = page.locator('button.tab-btn:has-text("配售")')
    if placement_tab.count() > 0:
        placement_tab.first.click()
        page.wait_for_timeout(1500)

    # 截图
    page.screenshot(path='tests/screenshots/convertible_placement.png', full_page=True)

    # 检查排序按钮
    sort_buttons = page.locator('.sort-btn')
    print("=== 排序按钮 ===")
    for i in range(sort_buttons.count()):
        print(f"  [{i}] {sort_buttons.nth(i).inner_text()}")

    # 检查 progress-tag 内容（验证 HTML 标签是否被剥离）
    progress_tags = page.locator('.progress-tag')
    print(f"\n=== progress-tag 内容 (共 {progress_tags.count()} 个) ===")
    for i in range(min(progress_tags.count(), 5)):
        text = progress_tags.nth(i).inner_text()
        html = progress_tags.nth(i).inner_html()
        has_html = '<' in html and '>' in html and ('br' in html.lower() or 'span' in html.lower())
        print(f"  [{i}] text={text!r} | has_html_tags={has_html}")

    # 检查登记日徽章
    reg_badges = page.locator('el-tag:has-text("登记")')
    print(f"\n=== 登记日徽章 (共 {reg_badges.count()} 个) ===")
    for i in range(min(reg_badges.count(), 5)):
        print(f"  [{i}] {reg_badges.nth(i).inner_text()}")

    # 检查表格行数据
    rows = page.locator('.desktop-table .el-table__row')
    print(f"\n=== 表格行数: {rows.count()} ===")
    if rows.count() > 0:
        first_row = rows.first
        name_cell = first_row.locator('.name-cell')
        print(f"  第一行名称: {name_cell.inner_text()[:100]}")

    print(f"\n=== Console 错误数: {len(console_errors)} ===")
    for err in console_errors:
        print(f"  {err}")

    browser.close()
    print("\n验证完成")
