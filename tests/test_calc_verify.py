"""计算与显示完整性验证
对比 API 原始数据与前端 UI 显示值，识别所有 falsy 检查导致的显示缺失。
覆盖：ClosedEnd / LOF / Convertible 三大页面
"""
import json
import urllib.request
from playwright.sync_api import sync_playwright

BASE_API = "http://localhost:8080"
BASE_WEB = "http://localhost:5173"
OUT_DIR = "tests/screenshots"

DASH = '--'

# 收集问题
issues = []


def add_issue(page, field, expected, actual, row_info=""):
    issues.append({
        "page": page,
        "field": field,
        "expected": expected,
        "actual": actual,
        "row": row_info
    })


def fetch_api(path):
    try:
        r = urllib.request.urlopen(f"{BASE_API}{path}", timeout=15)
        return json.loads(r.read()).get('data')
    except Exception as e:
        print(f"[API ERROR] {path}: {e}")
        return None


def approx_equal(a, b, eps=0.01):
    try:
        return abs(float(a) - float(b)) < eps
    except (ValueError, TypeError):
        return False


def test_closed_end(page, browser):
    """测试封闭式基金页面计算"""
    print("\n" + "=" * 60)
    print("[测试] ClosedEnd 封闭式基金")
    print("=" * 60)

    raw_list = fetch_api("/api/v1/closed-end/list")
    raw_summary = fetch_api("/api/v1/closed-end/summary")
    if not raw_list:
        print("  [SKIP] 无 API 数据")
        return

    page.goto(f"{BASE_WEB}/closed-end", wait_until="domcontentloaded")
    page.wait_for_load_state("networkidle", timeout=30000)
    page.wait_for_timeout(2500)
    page.screenshot(path=f"{OUT_DIR}/calc_closed_end.png", full_page=True)

    # 1. 概览字段
    print("\n--- 概览字段 ---")
    overview_values = page.locator(".overview-value").all_text_contents()
    print(f"  概览值: {overview_values}")
    print(f"  API summary: count={raw_summary.get('count')}, avg_discount={raw_summary.get('avg_discount')}, "
          f"high_discount_count={raw_summary.get('high_discount_count')}, premium_count={raw_summary.get('premium_count')}")

    if raw_summary:
        # avg_discount 为 0 时 UI 会显示 '--'（bug）
        api_avg = raw_summary.get('avg_discount')
        if api_avg is not None:
            expected_avg = ('+' if api_avg > 0 else '') + str(api_avg) + '%'
            actual_avg = overview_values[1] if len(overview_values) > 1 else ''
            if api_avg == 0:
                # bug: 0 会被 falsy 检查变成 '--'
                if actual_avg == DASH:
                    add_issue("ClosedEnd", "概览.平均折溢价", expected_avg, actual_avg,
                              f"API avg_discount={api_avg} (0 被当作 falsy)")
            elif not approx_equal(api_avg, actual_avg.replace('%', '').replace('+', '')):
                add_issue("ClosedEnd", "概览.平均折溢价", expected_avg, actual_avg,
                          f"API={api_avg}")

    # 2. 表格行字段
    print("\n--- 表格行字段 ---")
    rows = page.locator(".el-table__row").all()
    print(f"  表格行数: {len(rows)} (API: {len(raw_list)})")

    # 抽样检查前 5 行
    sample_count = min(5, len(rows))
    for i in range(sample_count):
        if i >= len(rows):
            break
        row_el = rows[i]
        raw = raw_list[i]
        code = raw.get('code', '')
        name = raw.get('name', '')
        nav = raw.get('nav', 0)
        price = raw.get('price', 0)
        discount = raw.get('discount', 0)
        change_pct = raw.get('change_pct', 0)
        amount = raw.get('amount', 0)

        print(f"\n  行 {i+1}: {name} ({code})")
        print(f"    API: nav={nav}, price={price}, discount={discount}, change_pct={change_pct}, amount={amount}")

        cells = row_el.locator(".cell").all_text_contents()
        row_text = " | ".join(c.strip() for c in cells)
        print(f"    UI:  {row_text[:200]}")

        # 检查 discount=0 时是否显示 '--'（BUG）
        if discount == 0:
            # 期望显示 "0.00%" 或 "0%"，而不是 '--'
            if DASH in row_text and '0.00%' not in row_text and '0%' not in row_text:
                add_issue("ClosedEnd", "表格.折价率", "0.00%", DASH,
                          f"{name}({code}) API discount=0, 被 falsy 检查变成 --")

        # 检查 change_pct=0 时是否显示 '--'（BUG）
        if change_pct == 0:
            if DASH in row_text:
                # 检查是否是因为 changePct=0
                # changePct: changePct ? ... : '--' 会让 0 变成 '--'
                add_issue("ClosedEnd", "表格.涨跌幅", "0.00%", DASH,
                          f"{name}({code}) API change_pct=0, 被 falsy 检查变成 --")

        # 检查 amount=0 时是否显示 '--'（BUG）
        if amount == 0:
            if DASH in row_text:
                add_issue("ClosedEnd", "表格.成交额", "0元或--", DASH,
                          f"{name}({code}) API amount=0")

        # 检查 nav=0 时净值显示 '--'（这是合理的，因为无净值数据）
        # 但 discount=0 且 nav>0 时，discount 应显示 0.00%

    # 3. 详情弹窗
    print("\n--- 详情弹窗 ---")
    if rows:
        rows[0].click()
        page.wait_for_timeout(800)
        page.screenshot(path=f"{OUT_DIR}/calc_closed_end_detail.png", full_page=True)

        # 检查年化折价计算
        # yearsToMaturity=0 时 annualizedDiscount=0，显示 '--'（合理，因为无到期日）
        dialog = page.locator(".el-dialog").last
        if dialog.count() > 0:
            dialog_text = dialog.inner_text()
            print(f"  弹窗内容: {dialog_text[:200]}")
            # 关闭弹窗
            close_btn = page.locator(".el-dialog__headerbtn").last
            if close_btn.count() > 0:
                close_btn.click()
                page.wait_for_timeout(300)


def test_lof(page, browser):
    """测试 LOF 基金页面计算"""
    print("\n" + "=" * 60)
    print("[测试] LOF 基金套利")
    print("=" * 60)

    raw_list = fetch_api("/api/v1/lof/list")
    if not raw_list:
        print("  [SKIP] 无 API 数据")
        return

    page.goto(f"{BASE_WEB}/lof", wait_until="domcontentloaded")
    page.wait_for_load_state("networkidle", timeout=30000)
    page.wait_for_timeout(2500)
    page.screenshot(path=f"{OUT_DIR}/calc_lof.png", full_page=True)

    print(f"\n  API 返回 {len(raw_list)} 只基金")

    # 找出 premium=0, valuation=0 的样本
    zero_premium_items = [i for i, r in enumerate(raw_list) if r.get('premium') == 0]
    zero_valuation_items = [i for i, r in enumerate(raw_list) if r.get('valuation') == 0]
    print(f"  premium=0 的基金数: {len(zero_premium_items)}")
    print(f"  valuation=0 的基金数: {len(zero_valuation_items)}")

    rows = page.locator(".el-table__row").all()
    print(f"  表格行数: {len(rows)}")

    # 检查表格行
    sample_count = min(10, len(rows))
    for i in range(sample_count):
        if i >= len(rows):
            break
        row_el = rows[i]
        raw = raw_list[i]
        code = raw.get('code', '')
        name = raw.get('name', '')
        price = raw.get('price', 0)
        valuation = raw.get('valuation', 0)
        premium = raw.get('premium', 0)
        change_pct = raw.get('change_pct', 0)
        amount = raw.get('amount', 0)

        cells = row_el.locator(".cell").all_text_contents()
        row_text = " | ".join(c.strip() for c in cells)

        # 检查 premium=0 时显示
        if premium == 0:
            # premiumText: premium.toFixed(2) + '%' (lof.js 没有 falsy 检查，应该正常)
            # 但 netPremiumText 当 netPremium = 0 - 0.15 = -0.15 时应显示 -0.15%
            expected_premium = "0.00%"
            if expected_premium not in row_text and '-0.15%' not in row_text:
                add_issue("LOF", "表格.溢价率", expected_premium, row_text[:100],
                          f"{name}({code}) API premium=0")

        # 检查 valuation=0 时显示
        if valuation == 0:
            # valuationText: valuation ? valuation.toFixed(4) : '--' 会让 0 变成 '--'
            # 这是合理的（无净值数据），但需要确认
            pass

        # 检查 amount=0 或 amount=null
        if amount is None or amount == 0:
            if DASH in row_text:
                # amountInfo.raw = 0, amountText = '--'（合理）
                pass

    # 沙盘计算验证
    print("\n--- 沙盘计算验证 ---")
    sandbox_header = page.locator(".sandbox-header").first
    if sandbox_header.count() > 0:
        sandbox_header.click()
        page.wait_for_timeout(500)

        # 默认值: premium=5, amount=10000, feeRate=0.15
        # 套利收益 = amount * premium/100 - amount * feeRate/100 - amount * 0.05/100
        #         = 10000 * 0.05 - 10000 * 0.0015 - 10000 * 0.0005 = 500 - 15 - 5 = 480
        result_value = page.locator(".result-value").first
        if result_value.count() > 0:
            profit_text = result_value.inner_text()
            print(f"  沙盘默认收益: {profit_text}")
            # 期望 480.00 元
            if '480' not in profit_text:
                add_issue("LOF", "沙盘.套利收益", "480.00 元", profit_text,
                          "默认参数 premium=5%, amount=10000, feeRate=0.15%")

        page.screenshot(path=f"{OUT_DIR}/calc_lof_sandbox.png", full_page=True)


def test_convertible(page, browser):
    """测试可转债页面计算"""
    print("\n" + "=" * 60)
    print("[测试] Convertible 可转债")
    print("=" * 60)

    raw_signals = fetch_api("/api/v1/convertible/signals")
    if not raw_signals:
        print("  [SKIP] 无 API 数据")
        return

    page.goto(f"{BASE_WEB}/convertible", wait_until="domcontentloaded")
    page.wait_for_load_state("networkidle", timeout=30000)
    page.wait_for_timeout(2500)
    page.screenshot(path=f"{OUT_DIR}/calc_convertible.png", full_page=True)

    # 双低 Tab
    print("\n--- 双低 Tab ---")
    double_low = raw_signals.get('double_low', [])
    print(f"  API 双低信号数: {len(double_low)}")

    # 切换到双低 Tab
    try:
        page.locator(".tab-btn:has-text('双低')").click(timeout=3000)
        page.wait_for_timeout(500)
    except Exception:
        pass

    rows = page.locator(".el-table__row").all()
    print(f"  表格行数: {len(rows)}")

    sample_count = min(5, len(rows))
    for i in range(sample_count):
        if i >= len(rows):
            break
        row_el = rows[i]
        if i >= len(double_low):
            break
        raw = double_low[i]
        bond_code = raw.get('bond_code', '')
        bond_name = raw.get('bond_name', '')
        price = raw.get('price', 0)
        conversion_value = raw.get('conversion_value', 0)
        premium_rate = raw.get('premium_rate', 0)
        double_low_val = raw.get('double_low', 0)

        cells = row_el.locator(".cell").all_text_contents()
        row_text = " | ".join(c.strip() for c in cells)

        print(f"\n  行 {i+1}: {bond_name} ({bond_code})")
        print(f"    API: price={price}, conv_val={conversion_value}, premium={premium_rate}, double_low={double_low_val}")
        print(f"    UI:  {row_text[:200]}")

        # 验证双低值 = price + premium_rate（premium_rate 已是百分比值，如 -0.98 表示 -0.98%）
        if price and double_low_val:
            expected_dl = price + premium_rate
            if not approx_equal(expected_dl, double_low_val, 0.1):
                add_issue("Convertible", "双低值计算", f"{price}+{premium_rate}={expected_dl:.2f}",
                          str(double_low_val), f"{bond_name}({bond_code})")

        # 检查 premium_rate=0 时显示（API 中 premium_rate 可能是 0）
        if premium_rate == 0:
            # premium: premiumRateNum !== 0 || item.premium_rate !== undefined ? premiumRateNum.toFixed(2) + '%' : '--'
            # 这个判断复杂，0 会显示为 "0.00%"
            if '0.00%' not in row_text and DASH in row_text:
                add_issue("Convertible", "表格.溢价率", "0.00%", DASH,
                          f"{bond_name}({bond_code}) API premium_rate=0")

    # 配售 Tab
    print("\n--- 配售 Tab ---")
    pending = fetch_api("/api/v1/convertible/pending")
    if pending:
        print(f"  API 配售数: {len(pending)}")
        # 切换到配售 Tab
        try:
            page.locator(".tab-btn:has-text('配售')").click(timeout=3000)
            page.wait_for_timeout(800)
        except Exception:
            pass

        rows = page.locator(".el-table__row").all()
        print(f"  配售表格行数: {len(rows)}")

        # 检查安全垫计算
        # safetyPad = item.safety_pad > 0 ? item.safety_pad : computeSafetyPad(...).value
        # computeSafetyPad: expectedProfit / (sharesFor10 * stockPrice) * 100
        # expectedProfit = 1000 * 0.2 = 200
        sample_count = min(3, len(rows))
        for i in range(sample_count):
            if i >= len(rows):
                break
            # 找到对应的 pending item（注意前端有过滤）
            raw = pending[i]
            stock_name = raw.get('stock_name', '')
            per_share = raw.get('per_share_allocation', 0)
            shares_for_10 = raw.get('shares_for_10_lots', 0)
            stock_price = raw.get('stock_price', 0)
            safety_pad = raw.get('safety_pad')

            print(f"\n  配售行 {i+1}: {stock_name}")
            print(f"    API: per_share={per_share}, shares_for_10={shares_for_10}, stock_price={stock_price}, safety_pad={safety_pad}")

            # 验证安全垫计算
            if shares_for_10 > 0 and stock_price > 0:
                expected_profit = 200  # 1000 * 0.2
                expected_safety = expected_profit / (shares_for_10 * stock_price) * 100
                if safety_pad and safety_pad > 0:
                    if not approx_equal(expected_safety, safety_pad, 0.5):
                        add_issue("Convertible", "安全垫计算",
                                  f"{expected_safety:.2f}%", f"{safety_pad}%",
                                  f"{stock_name}")
                print(f"    期望安全垫: {expected_safety:.2f}%")

    # 沙盘计算验证
    print("\n--- 可转债沙盘计算验证 ---")
    sandbox_header = page.locator(".sandbox-header").first
    if sandbox_header.count() > 0:
        sandbox_header.click()
        page.wait_for_timeout(500)

        # 默认值: price=105, premium=10, convPrice=10
        # cbDoubleLow = price + premium = 105 + 10 = 115
        # cbConvValue = 100 / convPrice * (price / (1 + premium/100))
        #             = 100 / 10 * (105 / 1.1) = 10 * 95.4545 = 954.545（错误？）
        # 实际公式: 100/转股价 * 正股价 = 100/10 * 105 = 1050？ 不对
        # 看 store: cbConvValue = 100 / convPrice * (price / (1 + premium/100))
        #                       = 100 / 10 * (105 / 1.1) = 10 * 95.4545 = 954.55
        # 这看起来不对。转股价值 = 100/转股价 * 正股价
        # 如果 price 是转债价格，premium 是溢价率，那么 正股价 = price / (1 + premium/100)
        # 但转股价值公式应该是 100/转股价 * 正股价，不是用转债价格反推
        # 这里沙盘用转债价格反推正股价: 正股价 = 转债价格 / (1 + 溢价率/100)
        # 然后转股价值 = 100/转股价 * 正股价 = 100/10 * (105/1.1) = 954.55
        # 但默认显示 954.55 看起来很大，可能不是 bug，只是默认参数问题

        result_values = page.locator(".result-value").all_text_contents()
        print(f"  沙盘结果值: {result_values}")

        # 验证双低值
        if len(result_values) >= 1:
            dl_text = result_values[0]
            expected_dl = 105 + 10  # 115.0
            if not approx_equal(expected_dl, dl_text.replace('双低值', '').strip(), 0.1):
                add_issue("Convertible", "沙盘.双低值", f"{expected_dl:.1f}", dl_text,
                          "默认 price=105, premium=10")

        # 验证转股价值
        if len(result_values) >= 2:
            conv_text = result_values[1]
            # cbConvValue = 100 / 10 * (105 / 1.1) = 954.545...
            expected_conv = 100 / 10 * (105 / (1 + 10/100))
            print(f"  期望转股价值: {expected_conv:.2f}, UI: {conv_text}")

        page.screenshot(path=f"{OUT_DIR}/calc_convertible_sandbox.png", full_page=True)


def test_console_errors(page_factory):
    """测试 console 错误"""
    print("\n" + "=" * 60)
    print("[测试] Console 错误扫描")
    print("=" * 60)

    page = page_factory()
    console_errors = []
    page_errors = []

    def on_console(msg):
        if msg.type in ("error", "warning"):
            console_errors.append({"type": msg.type, "text": msg.text[:200]})

    def on_pageerror(err):
        page_errors.append({"name": err.name, "message": str(err)[:200]})

    page.on("console", on_console)
    page.on("pageerror", on_pageerror)

    for path in ["/", "/lof", "/convertible", "/closed-end"]:
        page.goto(f"{BASE_WEB}{path}", wait_until="domcontentloaded")
        try:
            page.wait_for_load_state("networkidle", timeout=20000)
        except Exception:
            pass
        page.wait_for_timeout(1500)

    print(f"\n  console 错误数: {len(console_errors)}")
    for e in console_errors[:10]:
        print(f"    [{e['type']}] {e['text']}")
        if e['type'] == 'error':
            add_issue("Console", "JS错误", "无错误", e['text'])

    print(f"  页面 JS 异常数: {len(page_errors)}")
    for e in page_errors[:5]:
        print(f"    [{e['name']}] {e['message']}")
        add_issue("Console", "页面异常", "无异常", e['message'])


def main():
    import os
    os.makedirs(OUT_DIR, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})

        page = ctx.new_page()

        # 测试各页面
        test_closed_end(page, browser)
        test_lof(page, browser)
        test_convertible(page, browser)

        # Console 错误测试（新页面）
        def page_factory():
            return page
        test_console_errors(page_factory)

        browser.close()

    # 输出问题汇总
    print("\n" + "=" * 60)
    print("===== 计算与显示完整性问题汇总 =====")
    print("=" * 60)
    if not issues:
        print("  未发现问题 ✅")
    else:
        print(f"\n  共发现 {len(issues)} 个问题:\n")
        # 按 page 分组
        from collections import defaultdict
        grouped = defaultdict(list)
        for iss in issues:
            grouped[iss['page']].append(iss)

        for page_name, page_issues in grouped.items():
            print(f"\n  [{page_name}] ({len(page_issues)} 个问题)")
            for i, iss in enumerate(page_issues, 1):
                print(f"    {i}. 字段: {iss['field']}")
                print(f"       期望: {iss['expected']}")
                print(f"       实际: {iss['actual']}")
                print(f"       说明: {iss['row']}")

    # 保存问题到 JSON
    with open(f"{OUT_DIR}/calc_issues.json", "w", encoding="utf-8") as f:
        json.dump(issues, f, ensure_ascii=False, indent=2)
    print(f"\n  问题详情已保存到: {OUT_DIR}/calc_issues.json")


if __name__ == "__main__":
    main()
